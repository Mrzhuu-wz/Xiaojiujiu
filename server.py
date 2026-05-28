import json
import os
import re
import uuid
import zipfile
from datetime import datetime
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlparse
from xml.sax.saxutils import escape


BASE_DIR = Path(__file__).resolve().parent
STATIC_DIR = BASE_DIR / "static"
GENERATED_DIR = BASE_DIR / "generated"
TEMPLATES_DIR = BASE_DIR / "templates"
DATA_DIR = STATIC_DIR / "data"
LOGO_PATH = STATIC_DIR / "telecom-logo.png"
GENERATED_DIR.mkdir(exist_ok=True)
TEMPLATES_DIR.mkdir(exist_ok=True)
DATA_DIR.mkdir(exist_ok=True)

CHINESE_NUMBERS = "一二三四五六七八九十"

DEFAULT_TEMPLATE = {
    "name": "默认模板",
    "docDefaults": {
        "fontName": "Microsoft YaHei",
        "fontSize": 22,
    },
    "styles": {
        "Normal": {
            "fontSize": 22,
            "lineSpacing": 360,
            "alignment": "both",
            "firstLineIndent": 480,
            "spaceAfter": 140,
        },
        "CoverBrand": {
            "fontSize": 28,
            "bold": True,
            "color": "C00000",
            "spaceBefore": 720,
            "spaceAfter": 860,
        },
        "CoverTitle": {
            "fontSize": 42,
            "bold": True,
            "color": "C00000",
            "spaceAfter": 120,
        },
        "CoverCustomer": {
            "fontSize": 24,
            "color": "666666",
            "spaceBefore": 460,
            "spaceAfter": 900,
        },
        "CoverMeta": {
            "fontSize": 24,
            "spaceAfter": 180,
        },
        "Heading1": {
            "fontSize": 30,
            "bold": True,
            "color": "C00000",
            "spaceBefore": 360,
            "spaceAfter": 220,
        },
        "Heading2": {
            "fontSize": 24,
            "bold": True,
            "spaceBefore": 260,
            "spaceAfter": 120,
        },
        "Heading3": {
            "fontSize": 22,
            "bold": True,
            "spaceBefore": 180,
            "spaceAfter": 80,
        },
        "TableHeader": {
            "fontSize": 20,
            "bold": True,
            "color": "C00000",
            "alignment": "center",
        },
        "TableText": {
            "fontSize": 19,
        },
    },
}


# ---------------------------------------------------------------------------
# 模板管理
# ---------------------------------------------------------------------------

def ensure_default_template():
    """启动时确保默认模板存在"""
    path = TEMPLATES_DIR / "默认模板.json"
    if not path.exists():
        with open(path, "w", encoding="utf-8") as f:
            json.dump(DEFAULT_TEMPLATE, f, ensure_ascii=False, indent=2)


def load_template(name):
    """加载指定模板，失败则返回默认模板"""
    if not name:
        name = "默认模板"
    path = TEMPLATES_DIR / f"{name}.json"
    if path.exists():
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    # fallback to default
    default_path = TEMPLATES_DIR / "默认模板.json"
    if default_path.exists():
        with open(default_path, "r", encoding="utf-8") as f:
            return json.load(f)
    return dict(DEFAULT_TEMPLATE)


def list_templates():
    """列出所有模板名称"""
    names = []
    for f in sorted(TEMPLATES_DIR.glob("*.json")):
        name = f.stem
        try:
            with open(f, "r", encoding="utf-8") as fh:
                data = json.load(fh)
            names.append({
                "name": name,
                "displayName": data.get("name", name),
            })
        except Exception:
            names.append({"name": name, "displayName": name})
    # 确保默认模板排第一
    names.sort(key=lambda x: (0 if x["name"] == "默认模板" else 1, x["name"]))
    return names


def save_template(data):
    """保存模板"""
    name = data.get("name", "未命名模板")
    safe_name = re.sub(r"[^\w\u4e00-\u9fff-]+", "_", name).strip("_") or "template"
    path = TEMPLATES_DIR / f"{safe_name}.json"
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    return safe_name


def delete_template(name):
    """删除模板（不允许删除默认模板）"""
    if name == "默认模板":
        return False, "不能删除默认模板"
    path = TEMPLATES_DIR / f"{name}.json"
    if path.exists():
        path.unlink()
        return True, None
    return False, "模板不存在"


# ---------------------------------------------------------------------------
# 动态 styles.xml 生成
# ---------------------------------------------------------------------------

def _style_xml(style_id, style_name, cfg, is_default=False):
    """根据模板配置生成单个样式XML"""
    font_name = cfg.get("fontName", "Microsoft YaHei")
    font_size = cfg.get("fontSize", 22)
    bold = cfg.get("bold", False)
    color = cfg.get("color", "")
    alignment = cfg.get("alignment", "")
    line_spacing = cfg.get("lineSpacing", 0)
    space_before = cfg.get("spaceBefore", 0)
    space_after = cfg.get("spaceAfter", 0)
    first_line = cfg.get("firstLineIndent", 0)

    # rPr (run properties)
    rpr_parts = []
    rpr_parts.append(f'<w:rFonts w:ascii="{font_name}" w:eastAsia="{font_name}" w:hAnsi="{font_name}"/>')
    if bold:
        rpr_parts.append("<w:b/>")
    if color:
        rpr_parts.append(f'<w:color w:val="{color}"/>')
    rpr_parts.append(f'<w:sz w:val="{font_size}"/>')
    rpr = "".join(rpr_parts)

    # pPr (paragraph properties)
    ppr_parts = []
    spacing_attrs = []
    if line_spacing:
        spacing_attrs.append(f'w:line="{line_spacing}"')
        spacing_attrs.append('w:lineRule="auto"')
    if space_before:
        spacing_attrs.append(f'w:before="{space_before}"')
    if space_after:
        spacing_attrs.append(f'w:after="{space_after}"')
    if spacing_attrs:
        ppr_parts.append(f'<w:spacing {" ".join(spacing_attrs)}/>')
    if alignment:
        ppr_parts.append(f'<w:jc w:val="{alignment}"/>')
    if first_line:
        ppr_parts.append(f'<w:ind w:firstLine="{first_line}"/>')
    # headings get keepNext
    if style_id.startswith("Heading"):
        ppr_parts.insert(0, "<w:keepNext/>")

    default_attr = ' w:default="1"' if is_default else ""
    return (
        f'<w:style w:type="paragraph"{default_attr} w:styleId="{style_id}">'
        f'<w:name w:val="{style_name}"/>'
        f"{'<w:pPr>' + ''.join(ppr_parts) + '</w:pPr>' if ppr_parts else ''}"
        f"<w:rPr>{rpr}</w:rPr>"
        f"</w:style>"
    )


def build_styles_xml(template):
    """根据模板 JSON 生成完整的 styles.xml"""
    defaults = template.get("docDefaults", {})
    font_name = defaults.get("fontName", "Microsoft YaHei")
    font_size = defaults.get("fontSize", 22)

    styles = template.get("styles", {})

    xml_parts = [
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
        '<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">',
        '<w:docDefaults>',
        '<w:rPrDefault>',
        f'<w:rPr><w:rFonts w:ascii="{font_name}" w:eastAsia="{font_name}" w:hAnsi="{font_name}"/><w:sz w:val="{font_size}"/></w:rPr>',
        '</w:rPrDefault>',
        '</w:docDefaults>',
    ]

    # Normal style (default paragraph)
    normal_cfg = styles.get("Normal", {})
    xml_parts.append(_style_xml("Normal", "Normal", normal_cfg, is_default=True))

    # 封面样式
    for sid, sname in [("CoverBrand", "Cover Brand"), ("CoverTitle", "Cover Title"),
                       ("CoverCustomer", "Cover Customer"), ("CoverMeta", "Cover Meta")]:
        cfg = styles.get(sid, {})
        xml_parts.append(_style_xml(sid, sname, cfg))

    # 标题样式
    for sid, sname in [("Heading1", "heading 1"), ("Heading2", "heading 2"), ("Heading3", "heading 3")]:
        cfg = styles.get(sid, {})
        xml_parts.append(_style_xml(sid, sname, cfg))

    # 表格样式
    for sid, sname in [("TableHeader", "Table Header"), ("TableText", "Table Text")]:
        cfg = styles.get(sid, {})
        xml_parts.append(_style_xml(sid, sname, cfg))

    # 表格边框样式 (保持不变)
    xml_parts.append(
        '<w:style w:type="table" w:styleId="ProposalTable">'
        '<w:name w:val="Proposal Table"/>'
        '<w:tblPr>'
        '<w:tblBorders>'
        '<w:top w:val="single" w:sz="6" w:color="D9D9D9"/>'
        '<w:left w:val="single" w:sz="6" w:color="D9D9D9"/>'
        '<w:bottom w:val="single" w:sz="6" w:color="D9D9D9"/>'
        '<w:right w:val="single" w:sz="6" w:color="D9D9D9"/>'
        '<w:insideH w:val="single" w:sz="4" w:color="E6E6E6"/>'
        '<w:insideV w:val="single" w:sz="4" w:color="E6E6E6"/>'
        '</w:tblBorders>'
        '</w:tblPr>'
        '</w:style>'
    )

    xml_parts.append("</w:styles>")
    return "".join(xml_parts)


# ---------------------------------------------------------------------------
# OOXML 工具函数 (不变)
# ---------------------------------------------------------------------------

def safe_filename(value):
    cleaned = re.sub(r"[^\w\u4e00-\u9fff-]+", "_", value or "安全解决方案")
    return cleaned.strip("_") or "安全解决方案"


def text(value):
    return escape(str(value or ""))


def month_label():
    return datetime.now().strftime("%Y年%m月")


def cn_index(index):
    if 1 <= index <= len(CHINESE_NUMBERS):
        return CHINESE_NUMBERS[index - 1]
    return str(index)


def run(content="", bold=False, color=None):
    props = ""
    if bold:
        props += "<w:b/>"
    if color:
        props += f'<w:color w:val="{color}"/>'
    rpr = f"<w:rPr>{props}</w:rPr>" if props else ""
    return f"<w:r>{rpr}<w:t>{text(content)}</w:t></w:r>"


def paragraph(content="", style=None, align=None, runs=None):
    ppr = ""
    if style:
        ppr += f'<w:pStyle w:val="{style}"/>'
    if align:
        ppr += f'<w:jc w:val="{align}"/>'
    ppr_xml = f"<w:pPr>{ppr}</w:pPr>" if ppr else ""
    if runs is not None:
        return f"<w:p>{ppr_xml}{''.join(runs)}</w:p>"
    lines = str(content or "").splitlines() or [""]
    xml_runs = []
    for index, line in enumerate(lines):
        if index:
            xml_runs.append("<w:r><w:br/></w:r>")
        xml_runs.append(run(line))
    return f"<w:p>{ppr_xml}{''.join(xml_runs)}</w:p>"


def heading(content, level=1):
    return paragraph(content, f"Heading{level}")


def label_paragraph(label, value):
    return paragraph(runs=[run(f"{label}：", bold=True), run(value)])


def bullet(content):
    return paragraph(content, "Bullet")


def page_break():
    return '<w:p><w:r><w:br w:type="page"/></w:r></w:p>'


def logo_run(width=1306800, height=316800):
    return f"""
<w:r><w:drawing><wp:inline xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" distT="0" distB="0" distL="0" distR="0">
  <wp:extent cx="{width}" cy="{height}"/>
  <wp:effectExtent l="0" t="0" r="0" b="0"/>
  <wp:docPr id="1" name="中国电信Logo"/>
  <wp:cNvGraphicFramePr><a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/></wp:cNvGraphicFramePr>
  <a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
    <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">
      <pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
        <pic:nvPicPr><pic:cNvPr id="0" name="telecom-logo.png"/><pic:cNvPicPr/></pic:nvPicPr>
        <pic:blipFill><a:blip r:embed="rIdLogo"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>
        <pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="{width}" cy="{height}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr>
      </pic:pic>
    </a:graphicData>
  </a:graphic>
</wp:inline></w:drawing></w:r>"""


def cell(content, width, is_header=False, align=None):
    shade = '<w:shd w:fill="FBEAEA"/>' if is_header else ""
    valign = '<w:vAlign w:val="center"/>'
    style = "TableHeader" if is_header else "TableText"
    return (
        "<w:tc>"
        f'<w:tcPr><w:tcW w:w="{width}" w:type="dxa"/>{shade}{valign}</w:tcPr>'
        f"{paragraph(content, style, align)}"
        "</w:tc>"
    )


def table(rows, widths=None, aligns=None):
    if not rows:
        return ""
    col_count = len(rows[0])
    widths = widths or [int(9000 / col_count)] * col_count
    aligns = aligns or [None] * col_count
    table_rows = []
    for row_index, row in enumerate(rows):
        row_cells = []
        for index in range(col_count):
            row_cells.append(cell(row[index] if index < len(row) else "", widths[index], row_index == 0, aligns[index]))
        table_rows.append(f"<w:tr>{''.join(row_cells)}</w:tr>")
    return (
        "<w:tbl>"
        "<w:tblPr>"
        '<w:tblStyle w:val="ProposalTable"/>'
        '<w:tblW w:w="9000" w:type="dxa"/>'
        '<w:tblCellMar><w:top w:w="110" w:type="dxa"/><w:left w:w="120" w:type="dxa"/>'
        '<w:bottom w:w="110" w:type="dxa"/><w:right w:w="120" w:type="dxa"/></w:tblCellMar>'
        "</w:tblPr>"
        "<w:tblGrid>"
        + "".join(f'<w:gridCol w:w="{width}"/>' for width in widths)
        + "</w:tblGrid>"
        + "".join(table_rows)
        + "</w:tbl>"
    )


# ---------------------------------------------------------------------------
# 文档内容构建 (不变)
# ---------------------------------------------------------------------------

def cover(data):
    line1 = data.get("coverTitleLine1") or "中国电信勒索病毒防护"
    branch = data.get("branchName") or "中国电信股份有限公司xx分公司"
    date = data.get("docDate") or month_label()
    customer = data.get("customerName") or ""
    content = [
        paragraph(line1, "CoverTitle", "center"),
    ]
    if customer:
        content.append(paragraph(customer, "CoverCustomer", "center"))
    content.extend(
        [
            paragraph(branch, "CoverMeta", "center"),
            paragraph(date, "CoverMeta", "center"),
        ]
    )
    # 封面独立节：垂直居中
    sect_pr = (
        '<w:sectPr>'
        '<w:vAlign w:val="center"/>'
        '<w:pgSz w:w="11906" w:h="16838"/>'
        '<w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"'
        ' w:header="720" w:footer="720" w:gutter="0"/>'
        '</w:sectPr>'
    )
    return "".join(content) + sect_pr


def background_section(data):
    weaknesses = data.get("weaknesses") or []
    body = [
        heading("一、背景与需求分析"),
        paragraph(data.get("background") or ""),
    ]
    industry_context = data.get("industryContext")
    if industry_context:
        body.append(paragraph(industry_context))
    if weaknesses:
        body.append(paragraph("从大量实际案例来看，组织普遍存在以下几类共性短板，成为攻击入侵和扩散的突破口："))
        for item in weaknesses:
            label = item.get("title", "风险短板")
            value = item.get("description", "")
            body.append(paragraph(runs=[run(f"{label}：", bold=True), run(value)]))
    conclusion = data.get("requirementAnalysis") or (
        '为系统性抵御勒索病毒攻击，需构建覆盖\u201c网络边界防御 - 零信任访问控制 - 主机安全加固 - '
        '持续安全运营\u201d的纵深防护体系，实现从事前预防、事中检测阻断到事后快速响应的安全闭环。'
    )
    body.append(paragraph(conclusion))
    return "".join(body)


def architecture_section(data):
    rows = [["防护层面", "部署产品", "防护目标"]]
    for item in data.get("architectureRows") or []:
        rows.append([item.get("layer", ""), item.get("product", ""), item.get("goal", "")])
    if len(rows) == 1:
        rows.extend(
            [
                ["边界防御", "天翼安全大脑", "网络边界入侵防御、病毒查杀、失陷主机定位"],
                ["访问控制", "云脉（SASE）", "零信任访问、网络隐身、终端安全管控，替代端口映射暴露"],
                ["主机安全", "云镜（服务器版）", "漏洞扫描、基线核查、主机入侵检测"],
                ["安全运营", "安全运营（MSSP）", "7×24h安全监测、应急响应、定期评估"],
            ]
        )
    return "".join(
        [
            heading("二、方案架构"),
            paragraph(data.get("architecture") or ""),
            table(rows, [1900, 2300, 4800]),
        ]
    )


def product_section(product, index):
    title = product.get("title") or product.get("name") or "核心产品"
    body = [heading(f"（{cn_index(index)}）{title}", 2)]
    for para in product.get("paragraphs") or [product.get("description", "")]:
        if para:
            body.append(paragraph(para))
    if product.get("capability"):
        body.append(label_paragraph("核心能力", product.get("capability")))
    if product.get("deployMode"):
        body.append(label_paragraph("部署方式", product.get("deployMode")))
    if product.get("spec"):
        body.append(label_paragraph("推荐规格", product.get("spec")))
    return "".join(body)


def service_section(services, start_index):
    if not services:
        return ""
    body = [heading(f"（{cn_index(start_index)}）云剑安服", 2)]
    for index, item in enumerate(services, 1):
        body.append(heading(f"{index}、{item.get('name', '安全服务')}", 3))
        for key in ("content", "method", "frequency", "deliverable"):
            label = {"content": "服务内容", "method": "服务方式", "frequency": "服务频次", "deliverable": "交付成果"}[key]
            if item.get(key):
                body.append(label_paragraph(label, item.get(key)))
    return "".join(body)


def products_section(data):
    products = data.get("products") or []
    body = [heading("三、核心产品方案")]
    if products:
        for index, product in enumerate(products, 1):
            body.append(product_section(product, index))
        body.append(service_section(data.get("serviceItems") or [], len(products) + 1))
    else:
        body.append(paragraph("本章节将根据所选安全产品自动生成产品介绍、能力亮点与适用场景。"))
    return "".join(body)


def deployment_quote_section(data):
    deployments = data.get("deployments") or []
    deployment_rows = [["序号", "产品名称", "部署范围", "部署周期"]]
    for index, item in enumerate(deployments, 1):
        deployment_rows.append(
            [
                str(index),
                item.get("name") or item.get("system") or "",
                item.get("scope") or item.get("location") or "",
                item.get("cycle") or item.get("method") or "",
            ]
        )
    quotes = data.get("quotes") or []
    quote_rows = [["序号", "产品/服务名称", "产品规格", "优惠单价", "备注"]]
    for index, item in enumerate(quotes, 1):
        quote_rows.append(
            [
                str(index),
                item.get("name", ""),
                item.get("spec", ""),
                item.get("price") or item.get("unitPrice") or "",
                item.get("remark", ""),
            ]
        )
    return "".join(
        [
            heading("四、部署与报价"),
            heading("（一）产品部署及报价", 2),
            table(deployment_rows, [900, 2700, 3500, 1900], ["center", None, None, None]),
            heading("（二）报价", 2),
            table(quote_rows, [700, 2500, 2500, 1800, 1500], ["center", None, None, None, None]),
        ]
    )


def build_document_xml(data):
    body = [
        cover(data),
        background_section(data),
        architecture_section(data),
        products_section(data),
        deployment_quote_section(data),
    ]
    return (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" '
        'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
        "<w:body>"
        + "".join(body)
        + '<w:sectPr><w:headerReference w:type="default" r:id="rIdHeader1"/>'
        '<w:footerReference w:type="default" r:id="rIdFooter1"/>'
        '<w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1440" w:right="1440" '
        'w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/>'
        "</w:sectPr></w:body></w:document>"
    )


# ---------------------------------------------------------------------------
# docx 构建 (支持模板)
# ---------------------------------------------------------------------------

def build_docx(data, template_name=None):
    title = data.get("solutionTitle") or data.get("coverTitleLine1") or "安全解决方案"
    filename = f"{safe_filename(title)}_{uuid.uuid4().hex[:8]}.docx"
    path = GENERATED_DIR / filename

    # 加载模板
    template = load_template(template_name or data.get("templateName"))

    content_types = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Default Extension="png" ContentType="image/png"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
  <Override PartName="/word/header1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/>
  <Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/>
</Types>"""
    rels = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>"""
    doc_rels = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rIdHeader1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header" Target="header1.xml"/>
  <Relationship Id="rIdFooter1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/>
  <Relationship Id="rIdStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
  <Relationship Id="rIdLogo" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/telecom-logo.png"/>
</Relationships>"""

    header = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:hdr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><w:p><w:pPr><w:jc w:val="right"/></w:pPr>""" + logo_run(980100, 237600) + """</w:p></w:hdr>"""
    header_rels = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rIdLogo" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/telecom-logo.png"/>
</Relationships>"""
    footer = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:ftr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Microsoft YaHei" w:eastAsia="Microsoft YaHei"/><w:sz w:val="18"/></w:rPr><w:t>第 </w:t></w:r><w:r><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:instrText>PAGE</w:instrText></w:r><w:r><w:fldChar w:fldCharType="end"/></w:r><w:r><w:t> 页</w:t></w:r></w:p></w:ftr>"""

    with zipfile.ZipFile(path, "w", zipfile.ZIP_DEFLATED) as docx:
        docx.writestr("[Content_Types].xml", content_types)
        docx.writestr("_rels/.rels", rels)
        docx.writestr("word/_rels/document.xml.rels", doc_rels)
        docx.writestr("word/document.xml", build_document_xml(data))
        docx.writestr("word/styles.xml", build_styles_xml(template))
        docx.writestr("word/header1.xml", header)
        docx.writestr("word/_rels/header1.xml.rels", header_rels)
        docx.writestr("word/footer1.xml", footer)
        if LOGO_PATH.exists():
            docx.write(LOGO_PATH, "word/media/telecom-logo.png")
    return filename


# ---------------------------------------------------------------------------
# HTTP 服务
# ---------------------------------------------------------------------------

class ReusableThreadingHTTPServer(ThreadingHTTPServer):
    allow_reuse_address = True


class AppHandler(SimpleHTTPRequestHandler):
    def translate_path(self, path):
        parsed = urlparse(path)
        request_path = unquote(parsed.path)
        if request_path.startswith("/generated/"):
            return str(BASE_DIR / request_path.lstrip("/"))
        if request_path == "/":
            return str(STATIC_DIR / "index.html")
        return str(STATIC_DIR / request_path.lstrip("/"))

    def _json(self, code, data):
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.end_headers()
        self.wfile.write(json.dumps(data, ensure_ascii=False).encode("utf-8"))

    def do_GET(self):
        parsed = urlparse(self.path)
        path = unquote(parsed.path)

        # 模板 API
        if path == "/api/templates":
            return self._json(200, list_templates())
        if path.startswith("/api/templates/"):
            name = path[len("/api/templates/"):]
            template = load_template(name)
            return self._json(200, template)

        # 数据管理 API
        if path.startswith("/api/data/"):
            data_type = path[len("/api/data/"):]
            allowed = {"industries", "scenarios", "products", "services"}
            if data_type not in allowed:
                return self._json(400, {"error": "不支持的数据类型"})
            file_path = DATA_DIR / f"{data_type}.json"
            if file_path.exists():
                with open(file_path, "r", encoding="utf-8") as f:
                    return self._json(200, json.load(f))
            return self._json(404, {"error": "数据不存在"})

        return super().do_GET()

    def do_POST(self):
        parsed = urlparse(self.path)
        path = unquote(parsed.path)
        length = int(self.headers.get("Content-Length", 0))
        payload = self.rfile.read(length)

        # 生成文档
        if path == "/api/generate":
            try:
                data = json.loads(payload.decode("utf-8"))
                filename = build_docx(data)
            except Exception as exc:
                return self._json(500, {"error": str(exc)})
            return self._json(200, {"filename": filename, "url": f"/generated/{filename}"})

        # 保存模板
        if path == "/api/templates":
            try:
                data = json.loads(payload.decode("utf-8"))
                safe_name = save_template(data)
                return self._json(200, {"name": safe_name, "message": "模板已保存"})
            except Exception as exc:
                return self._json(500, {"error": str(exc)})

        # 删除模板
        if path.startswith("/api/templates/") and path.endswith("/delete"):
            name = path[len("/api/templates/"):-len("/delete")]
            ok, err = delete_template(name)
            if ok:
                return self._json(200, {"message": "模板已删除"})
            return self._json(400, {"error": err})

        # ----- 数据管理 API -----
        # 注意：删除路径 /api/data/{type}/{id}/delete 必须放在保存之前检查
        if path.startswith("/api/data/") and path.endswith("/delete"):
            inner = path[len("/api/data/"):-len("/delete")]
            parts = inner.split("/")
            if len(parts) == 2:
                data_type, item_id = parts
                allowed = {"industries", "scenarios", "products", "services"}
                if data_type not in allowed:
                    return self._json(400, {"error": "不支持的数据类型"})
                file_path = DATA_DIR / f"{data_type}.json"
                if file_path.exists():
                    with open(file_path, "r", encoding="utf-8") as f:
                        existing = json.load(f)
                    if item_id in existing:
                        del existing[item_id]
                        with open(file_path, "w", encoding="utf-8") as f:
                            json.dump(existing, f, ensure_ascii=False, indent=2)
                        return self._json(200, {"message": "删除成功"})
                return self._json(404, {"error": "记录不存在"})

        # 数据保存
        if path.startswith("/api/data/"):
            data_type = path[len("/api/data/"):]
            allowed = {"industries", "scenarios", "products", "services"}
            if data_type not in allowed:
                return self._json(400, {"error": "不支持的数据类型"})
            file_path = DATA_DIR / f"{data_type}.json"
            try:
                new_data = json.loads(payload.decode("utf-8"))
                existing = {}
                if file_path.exists():
                    with open(file_path, "r", encoding="utf-8") as f:
                        existing = json.load(f)
                item_id = new_data.get("id", "")
                existing[item_id] = new_data
                with open(file_path, "w", encoding="utf-8") as f:
                    json.dump(existing, f, ensure_ascii=False, indent=2)
                return self._json(200, {"message": "保存成功", "id": item_id})
            except Exception as exc:
                return self._json(500, {"error": str(exc)})

        self.send_error(404)


if __name__ == "__main__":
    ensure_default_template()
    port = int(os.environ.get("PORT", "8000"))
    host = os.environ.get("HOST", "127.0.0.1")
    try:
        server = ReusableThreadingHTTPServer((host, port), AppHandler)
    except PermissionError:
        print(f"启动失败：当前环境不允许绑定 {host}:{port}。请换一个端口，或在本机终端运行：PORT=8088 python3 server.py")
        raise
    print(f"方案生成工作台已启动：http://{host}:{port}")
    server.serve_forever()
