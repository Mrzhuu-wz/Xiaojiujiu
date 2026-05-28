import JSZip from "jszip";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const logoPath = resolve(here, "../../static/telecom-logo.png");
const CN = "一二三四五六七八九十";

const DEFAULT_TEMPLATE = {
  docDefaults: { fontName: "Microsoft YaHei", fontSize: 22 },
  styles: {
    Normal:        { fontSize: 22, lineSpacing: 360, alignment: "both", firstLineIndent: 480, spaceAfter: 140 },
    CoverTitle:    { fontSize: 42, bold: true, color: "C00000", alignment: "center", spaceAfter: 120 },
    CoverCustomer: { fontSize: 24, color: "666666", alignment: "center", spaceBefore: 460, spaceAfter: 900 },
    CoverMeta:     { fontSize: 24, alignment: "center", spaceAfter: 180 },
    CoverBrand:    { fontSize: 28, bold: true, color: "C00000", spaceBefore: 720, spaceAfter: 860 },
    Heading1:      { fontSize: 30, bold: true, color: "C00000", spaceBefore: 360, spaceAfter: 220 },
    Heading2:      { fontSize: 24, bold: true, spaceBefore: 260, spaceAfter: 120 },
    Heading3:      { fontSize: 22, bold: true, spaceBefore: 180, spaceAfter: 80 },
    TableHeader:   { fontSize: 20, bold: true, color: "C00000", alignment: "center" },
    TableText:     { fontSize: 19 },
  },
};

function esc(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function safeFilename(value) {
  return String(value || "安全解决方案")
    .replace(/[^\w\u4e00-\u9fff-]+/g, "_")
    .replace(/^_+|_+$/g, "") || "安全解决方案";
}

function cnIndex(index) {
  return index >= 1 && index <= CN.length ? CN[index - 1] : String(index);
}

function run(content = "", bold = false, color = "") {
  const props = `${bold ? "<w:b/>" : ""}${color ? `<w:color w:val="${color}"/>` : ""}`;
  return `<w:r>${props ? `<w:rPr>${props}</w:rPr>` : ""}<w:t>${esc(content)}</w:t></w:r>`;
}

function paragraph(content = "", style = "", align = "", runs = null) {
  const ppr = `${style ? `<w:pStyle w:val="${style}"/>` : ""}${align ? `<w:jc w:val="${align}"/>` : ""}`;
  if (runs) return `<w:p>${ppr ? `<w:pPr>${ppr}</w:pPr>` : ""}${runs.join("")}</w:p>`;
  const lines = String(content || "").split(/\n/);
  const body = lines.map((line, index) => `${index ? "<w:r><w:br/></w:r>" : ""}${run(line)}`).join("");
  return `<w:p>${ppr ? `<w:pPr>${ppr}</w:pPr>` : ""}${body}</w:p>`;
}

function heading(content, level = 1) {
  return paragraph(content, `Heading${level}`);
}

function labelParagraph(label, value) {
  return paragraph("", "", "", [run(`${label}：`, true), run(value)]);
}

function pageBreak() {
  return '<w:p><w:r><w:br w:type="page"/></w:r></w:p>';
}

function logoRun(width = 1306800, height = 316800) {
  return `<w:r><w:drawing><wp:inline xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${width}" cy="${height}"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:docPr id="1" name="中国电信Logo"/><wp:cNvGraphicFramePr><a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/></wp:cNvGraphicFramePr><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="0" name="telecom-logo.png"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="rIdLogo"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${width}" cy="${height}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>`;
}

function cell(content, width, isHeader = false, align = "") {
  const shade = isHeader ? '<w:shd w:fill="FBEAEA"/>' : "";
  const style = isHeader ? "TableHeader" : "TableText";
  return `<w:tc><w:tcPr><w:tcW w:w="${width}" w:type="dxa"/>${shade}<w:vAlign w:val="center"/></w:tcPr>${paragraph(content, style, align)}</w:tc>`;
}

function table(rows, widths, aligns = []) {
  if (!rows?.length) return "";
  const body = rows.map((row, rowIndex) => `<w:tr>${row.map((item, index) => cell(item, widths[index], rowIndex === 0, aligns[index])).join("")}</w:tr>`).join("");
  return `<w:tbl><w:tblPr><w:tblStyle w:val="ProposalTable"/><w:tblW w:w="9000" w:type="dxa"/><w:tblCellMar><w:top w:w="110" w:type="dxa"/><w:left w:w="120" w:type="dxa"/><w:bottom w:w="110" w:type="dxa"/><w:right w:w="120" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid>${widths.map((width) => `<w:gridCol w:w="${width}"/>`).join("")}</w:tblGrid>${body}</w:tbl>`;
}

function cover(data) {
  const parts = [
    paragraph(data.coverTitleLine1 || "中国电信安全解决方案", "CoverTitle", "center"),
  ];
  if (data.customerName) parts.push(paragraph(data.customerName, "CoverCustomer", "center"));
  parts.push(paragraph(data.branchName || "中国电信股份有限公司xx分公司", "CoverMeta", "center"));
  parts.push(paragraph(data.docDate || new Date().toISOString().slice(0, 7), "CoverMeta", "center"));
  parts.push(pageBreak());
  return parts.join("");
}

function backgroundSection(data) {
  const body = [heading("一、背景与需求分析")];
  for (const part of String(data.background || "").split(/\n+/).filter(Boolean)) body.push(paragraph(part));
  for (const part of String(data.industryContext || "").split(/\n+/).filter(Boolean)) body.push(paragraph(part));
  if (data.weaknesses?.length) {
    body.push(paragraph("从大量实际案例来看，客户可能存在以下安全短板："));
    for (const item of data.weaknesses) body.push(paragraph("", "", "", [run(`${item.title || "风险短板"}：`, true), run(item.description || "")]));
  }
  for (const part of String(data.requirementAnalysis || "").split(/\n+/).filter(Boolean)) body.push(paragraph(part));
  return body.join("");
}

function architectureSection(data) {
  const rows = [["防护层面", "部署产品", "防护目标"], ...(data.architectureRows || []).map((item) => [item.layer || "", item.product || "", item.goal || ""])];
  return [heading("二、方案架构"), paragraph(data.architecture || ""), table(rows, [1900, 2300, 4800])].join("");
}

function productsSection(data) {
  const body = [heading("三、核心产品方案")];
  (data.products || []).forEach((product, index) => {
    body.push(heading(`（${cnIndex(index + 1)}）${product.title || product.name || "核心产品"}`, 2));
    for (const para of product.paragraphs || []) body.push(paragraph(para));
    if (product.capability) body.push(labelParagraph("核心能力", product.capability));
    if (product.deployMode) body.push(labelParagraph("部署方式", product.deployMode));
    if (product.spec) body.push(labelParagraph("推荐规格", product.spec));
  });
  const services = data.serviceItems || [];
  if (services.length) {
    body.push(heading(`（${cnIndex((data.products || []).length + 1)}）安全服务`, 2));
    services.forEach((item, index) => {
      body.push(heading(`${index + 1}、${item.name || "安全服务"}`, 3));
      if (item.content) body.push(labelParagraph("服务内容", item.content));
      if (item.method) body.push(labelParagraph("服务方式", item.method));
      if (item.frequency) body.push(labelParagraph("服务频次", item.frequency));
      if (item.deliverable) body.push(labelParagraph("交付成果", item.deliverable));
    });
  }
  return body.join("");
}

function deploymentQuoteSection(data) {
  const deployments = [["序号", "产品名称", "部署范围", "部署周期"], ...(data.deployments || []).map((item, index) => [String(index + 1), item.name || "", item.scope || "", item.cycle || ""])];
  const quotes = [["序号", "产品/服务名称", "产品规格", "优惠单价", "备注"], ...(data.quotes || []).map((item, index) => [String(index + 1), item.name || "", item.spec || "", item.price || "", item.remark || ""])];
  return [
    heading("四、部署与报价"),
    heading("（一）产品部署及报价", 2),
    table(deployments, [900, 2700, 3500, 1900], ["center"]),
    heading("（二）报价", 2),
    table(quotes, [700, 2500, 2500, 1800, 1500], ["center"]),
  ].join("");
}

function documentXml(data) {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><w:body>${cover(data)}${backgroundSection(data)}${architectureSection(data)}${productsSection(data)}${deploymentQuoteSection(data)}<w:sectPr><w:headerReference w:type="default" r:id="rIdHeader1"/><w:footerReference w:type="default" r:id="rIdFooter1"/><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/></w:sectPr></w:body></w:document>`;
}

// ---- 动态 styles.xml 生成 ----

function styleXml(styleId, styleName, cfg, isDefault = false) {
  const fontName = cfg.fontName || "Microsoft YaHei";
  const fontSize = cfg.fontSize || 22;
  const bold = cfg.bold || false;
  const color = cfg.color || "";
  const alignment = cfg.alignment || "";
  const lineSpacing = cfg.lineSpacing || 0;
  const spaceBefore = cfg.spaceBefore || 0;
  const spaceAfter = cfg.spaceAfter || 0;
  const firstLine = cfg.firstLineIndent || 0;

  const rprParts = [];
  rprParts.push(`<w:rFonts w:ascii="${fontName}" w:eastAsia="${fontName}" w:hAnsi="${fontName}"/>`);
  if (bold) rprParts.push("<w:b/>");
  if (color) rprParts.push(`<w:color w:val="${color}"/>`);
  rprParts.push(`<w:sz w:val="${fontSize}"/>`);

  const pprParts = [];
  const spacingAttrs = [];
  if (lineSpacing) { spacingAttrs.push(`w:line="${lineSpacing}"`); spacingAttrs.push('w:lineRule="auto"'); }
  if (spaceBefore) spacingAttrs.push(`w:before="${spaceBefore}"`);
  if (spaceAfter) spacingAttrs.push(`w:after="${spaceAfter}"`);
  if (spacingAttrs.length) pprParts.push(`<w:spacing ${spacingAttrs.join(" ")}/>`);
  if (alignment) pprParts.push(`<w:jc w:val="${alignment}"/>`);
  if (firstLine) pprParts.push(`<w:ind w:firstLine="${firstLine}"/>`);
  if (styleId.startsWith("Heading")) pprParts.unshift("<w:keepNext/>");

  const defaultAttr = isDefault ? ' w:default="1"' : "";
  return `<w:style w:type="paragraph"${defaultAttr} w:styleId="${styleId}"><w:name w:val="${styleName}"/>${pprParts.length ? `<w:pPr>${pprParts.join("")}</w:pPr>` : ""}<w:rPr>${rprParts.join("")}</w:rPr></w:style>`;
}

function buildStylesXml(template) {
  const defaults = template.docDefaults || {};
  const fontName = defaults.fontName || "Microsoft YaHei";
  const fontSize = defaults.fontSize || 22;
  const styles = template.styles || {};

  const parts = [
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">`,
    `<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="${fontName}" w:eastAsia="${fontName}" w:hAnsi="${fontName}"/><w:sz w:val="${fontSize}"/></w:rPr></w:rPrDefault></w:docDefaults>`,
    styleXml("Normal", "Normal", styles.Normal || {}, true),
  ];

  for (const [sid, sname] of [["CoverBrand", "Cover Brand"], ["CoverTitle", "Cover Title"], ["CoverCustomer", "Cover Customer"], ["CoverMeta", "Cover Meta"]]) {
    parts.push(styleXml(sid, sname, styles[sid] || {}));
  }
  for (const [sid, sname] of [["Heading1", "heading 1"], ["Heading2", "heading 2"], ["Heading3", "heading 3"]]) {
    parts.push(styleXml(sid, sname, styles[sid] || {}));
  }
  for (const [sid, sname] of [["TableHeader", "Table Header"], ["TableText", "Table Text"]]) {
    parts.push(styleXml(sid, sname, styles[sid] || {}));
  }

  parts.push(
    '<w:style w:type="table" w:styleId="ProposalTable"><w:name w:val="Proposal Table"/><w:tblPr><w:tblBorders>',
    '<w:top w:val="single" w:sz="6" w:color="D9D9D9"/><w:left w:val="single" w:sz="6" w:color="D9D9D9"/>',
    '<w:bottom w:val="single" w:sz="6" w:color="D9D9D9"/><w:right w:val="single" w:sz="6" w:color="D9D9D9"/>',
    '<w:insideH w:val="single" w:sz="4" w:color="E6E6E6"/><w:insideV w:val="single" w:sz="4" w:color="E6E6E6"/>',
    '</w:tblBorders></w:tblPr></w:style>',
    '</w:styles>',
  );

  return parts.join("");
}

async function buildDocx(data) {
  const template = (data.template && data.template.styles) ? data.template : DEFAULT_TEMPLATE;
  const zip = new JSZip();
  zip.file("[Content_Types].xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/header1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/><Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/></Types>`);
  zip.file("_rels/.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`);
  zip.file("word/_rels/document.xml.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdHeader1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header" Target="header1.xml"/><Relationship Id="rIdFooter1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/><Relationship Id="rIdStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="rIdLogo" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/telecom-logo.png"/></Relationships>`);
  zip.file("word/document.xml", documentXml(data));
  zip.file("word/styles.xml", buildStylesXml(template));
  zip.file("word/header1.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:hdr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><w:p><w:pPr><w:jc w:val="right"/></w:pPr>${logoRun(980100, 237600)}</w:p></w:hdr>`);
  zip.file("word/_rels/header1.xml.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdLogo" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/telecom-logo.png"/></Relationships>`);
  zip.file("word/footer1.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:ftr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Microsoft YaHei" w:eastAsia="Microsoft YaHei"/><w:sz w:val="18"/></w:rPr><w:t>第 </w:t></w:r><w:r><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:instrText>PAGE</w:instrText></w:r><w:r><w:fldChar w:fldCharType="end"/></w:r><w:r><w:t> 页</w:t></w:r></w:p></w:ftr>`);
  zip.file("word/media/telecom-logo.png", await readFile(logoPath));
  return zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
}

export default async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  try {
    const data = await req.json();
    const filename = `${safeFilename(data.solutionTitle || data.coverTitleLine1)}.docx`;
    const buffer = await buildDocx(data);
    return new Response(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json; charset=utf-8" },
    });
  }
};

export const config = {
  path: "/api/generate",
  method: ["POST"],
};
