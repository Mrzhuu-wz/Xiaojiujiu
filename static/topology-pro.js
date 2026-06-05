/**
 * 网络拓扑编辑器
 */
var topo = {
  nodes: [], connections: [], selectedNode: null, selectedConnId: null,
  connectFrom: null, history: [], historyIdx: -1, zoom: 1.0, gridOn: true,
  multiSelected: [], _canvasBound: false, zones: [], selectedZone: null, textBoxes: [], selectedTextBox: null
};

// ============== 连线ID生成 ==============
var _connIdCounter = 0;
function newConnId() {
  _connIdCounter++;
  return 'c' + Date.now() + '_' + _connIdCounter;
}

// 节点尺寸（CSS固定: 105×85, box-sizing:border-box）
var NODE_W = 105, NODE_H = 85, NODE_MIDX = 52.5, NODE_MIDY = 42.5;

// 获取节点中心坐标（简单圆心连线）
function nodeCenter(node) {
  return { x: node.x + NODE_MIDX, y: node.y + NODE_MIDY };
}

function initEditor() {
  renderComponents();
  loadTemplate();
  setupDragDrop();
  setupKeyboard();
  setupCanvasEvents();
  saveHistory();
}

// ============== 组件库 ==============
function renderComponentGroup(cid, types) {
  var el = document.getElementById(cid);
  if (!el) return;
  el.innerHTML = '';
  types.forEach(function(t) {
    var icon = (window.TopologyIcons||TopologyIcons)[t];
    if (!icon) return;
    var d = document.createElement('div');
    d.className = 'component-item'; d.draggable = true; d.dataset.type = t;
    d.innerHTML = '<div style="width:40px;height:40px;margin:0 auto;display:flex;align-items:center;justify-content:center;color:#C00000;">'+icon.svg+'</div><div style="font-size:11px;margin-top:3px;color:#333;">'+icon.name+'</div>';
    d.addEventListener('dragstart', function(e) { e.dataTransfer.setData('text/plain', t); e.dataTransfer.effectAllowed = 'copy'; });
    el.appendChild(d);
  });
}

function renderComponents() {
  renderComponentGroup('networkComponents', ['router','switch','server','pc','firewall','internet']);
  renderComponentGroup('securityComponents', ['brain','cloud','shield','shieldServer','web','compliance','antiD','msss','cloudWAF','bastion','logAudit','dbAudit','vulnScan','siem']);
  renderComponentGroup('zoneComponents', ['serverZone','dmzZone','officeZone','internetZone']);
}

// ============== 画布事件 ==============
var _boxSelecting = false, _boxStartX = 0, _boxStartY = 0;
function setupCanvasEvents() {
  var canvas = document.getElementById('topologyCanvas');
  if (!canvas || topo._canvasBound) return;
  topo._canvasBound = true;

  canvas.addEventListener('mousedown', function(e) {
    // 空白处：开始框选（锚点事件由各节点的 mousedown 直接处理）
    if (e.target === canvas || e.target.id === 'topoSVG') {
      _boxSelecting = true;
      _boxStartX = e.offsetX;
      _boxStartY = e.offsetY;
      // 取消选中
      topo.selectedNode = null; topo.selectedConnId = null; topo.multiSelected = []; topo.selectedZone = null;
      renderCanvas(); renderPropPanel();
    }
  });

  canvas.addEventListener('mousemove', function(e) {
    if (!_boxSelecting) return;
    // 绘制选框
    var x1 = Math.min(_boxStartX, e.offsetX), y1 = Math.min(_boxStartY, e.offsetY);
    var x2 = Math.max(_boxStartX, e.offsetX), y2 = Math.max(_boxStartY, e.offsetY);
    var selBox = document.getElementById('selectionBox');
    if (!selBox) {
      selBox = document.createElement('div');
      selBox.id = 'selectionBox';
      selBox.style.cssText = 'position:absolute;border:1px dashed #C00000;background:rgba(192,0,0,0.08);z-index:20;pointer-events:none;';
      canvas.appendChild(selBox);
    }
    selBox.style.left = x1 + 'px'; selBox.style.top = y1 + 'px';
    selBox.style.width = (x2 - x1) + 'px'; selBox.style.height = (y2 - y1) + 'px';
  });

  canvas.addEventListener('mouseup', function(e) {
    if (!_boxSelecting) return;
    _boxSelecting = false;
    var selBox = document.getElementById('selectionBox');
    if (selBox) selBox.remove();
    var x1 = Math.min(_boxStartX, e.offsetX), y1 = Math.min(_boxStartY, e.offsetY);
    var x2 = Math.max(_boxStartX, e.offsetX), y2 = Math.max(_boxStartY, e.offsetY);
    // 选框过小视为单击
    if (x2 - x1 < 4 && y2 - y1 < 4) return;
    // AABB 碰撞检测
    topo.multiSelected = [];
    topo.nodes.forEach(function(n) {
      if (n.x + NODE_W > x1 && n.x < x2 && n.y + NODE_H > y1 && n.y < y2) {
        topo.multiSelected.push(n.id);
      }
    });
    if (topo.multiSelected.length === 0) return;
    topo.selectedNode = null; topo.selectedConnId = null; topo.selectedZone = null;
    renderCanvas(); renderPropPanel();
  });

  // 点击连线
  canvas.addEventListener('click', function(e) {
    if (_boxSelecting) return;
    if (topo.selectedNode || topo.selectedZone || topo.multiSelected.length) return;
    // 检测最近连线
    var pos = { x: e.offsetX, y: e.offsetY };
    var bestDist = Infinity, bestConn = null;
    topo.connections.forEach(function(conn) {
      var fn = topo.nodes.find(function(n){return n.id===conn.from;});
      var tn = topo.nodes.find(function(n){return n.id===conn.to;});
      if (!fn || !tn) return;
      var fp = nodeCenter(fn);
      var tp = nodeCenter(tn);
      var dist = pointToSegDist(pos.x, pos.y, fp.x, fp.y, tp.x, tp.y);
      if (dist < bestDist) { bestDist = dist; bestConn = conn; }
    });
    if (bestDist <= 15 && bestConn) {
      topo.selectedConnId = bestConn.id;
      topo.selectedNode = null; topo.multiSelected = []; topo.selectedZone = null;
      renderCanvas(); renderPropPanel();
    } else {
      topo.selectedNode = null; topo.selectedConnId = null; topo.multiSelected = []; topo.selectedZone = null;
      renderCanvas(); renderPropPanel();
    }
  });

  // 双击空白处创建文本框
  canvas.addEventListener('dblclick', function(e) {
    if (e.target !== canvas && e.target.id !== 'topoSVG') return;
    var rect = canvas.getBoundingClientRect();
    var sc = canvas.parentElement;
    var mx = (e.clientX - rect.left) / topo.zoom + sc.scrollLeft;
    var my = (e.clientY - rect.top) / topo.zoom + sc.scrollTop;
    var ta = document.createElement('textarea');
    ta.style.cssText = 'position:absolute;left:'+mx+'px;top:'+my+'px;width:180px;height:60px;z-index:30;'+
      'border:2px solid #C00000;border-radius:4px;padding:4px;font-size:14px;resize:none;';
    ta.placeholder = '输入文字，回车确认';
    ta.addEventListener('keydown', function(ev) {
      if (ev.key === 'Enter' && !ev.shiftKey) {
        ev.preventDefault();
        var txt = ta.value.trim();
        if (txt) {
          topo.textBoxes.push({ id: 't'+Date.now(), x: mx, y: my, text: txt });
          saveHistory(); renderCanvas();
        }
        ta.remove();
      }
      if (ev.key === 'Escape') ta.remove();
    });
    ta.addEventListener('blur', function() { setTimeout(function(){ ta.remove(); }, 100); });
    canvas.appendChild(ta);
    ta.focus();
  });
}

function pointToSegDist(px, py, x1, y1, x2, y2) {
  var dx = x2 - x1, dy = y2 - y1;
  var lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(px - x1, py - y1);
  var t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lenSq));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

// ============== 画布渲染 ==============
function renderCanvas() {
  var canvas = document.getElementById('topologyCanvas');
  if (!canvas) return;
  canvas.innerHTML = '';
  canvas.classList.toggle('grid-visible', topo.gridOn);

  // 应用缩放（只缩放画布本身，不影响工具栏）
  canvas.style.transform = 'scale(' + topo.zoom + ')';
  canvas.style.transformOrigin = '0 0';

  // ========== SVG层 ==========
  var svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
  svg.id = 'topoSVG';
  svg.setAttribute('width','4000'); svg.setAttribute('height','3000');
  svg.style.cssText = 'position:absolute;top:0;left:0;z-index:5;pointer-events:none;';

  // 箭头定义
  var defs = document.createElementNS('http://www.w3.org/2000/svg','defs');
  ['#C00000','#333333','#2196F3'].forEach(function(c) {
    var mk = document.createElementNS('http://www.w3.org/2000/svg','marker');
    var cid = c.replace('#','');
    mk.id = 'arrow-'+cid;
    mk.setAttribute('markerWidth','10'); mk.setAttribute('markerHeight','10');
    mk.setAttribute('refX','9'); mk.setAttribute('refY','5'); mk.setAttribute('orient','auto');
    var p = document.createElementNS('http://www.w3.org/2000/svg','path');
    p.setAttribute('d','M0,0 L10,5 L0,10 Z');
    p.setAttribute('fill', c);
    mk.appendChild(p);
    defs.appendChild(mk);
  });
  svg.appendChild(defs);

  topo.connections.forEach(function(conn) {
    var fn = topo.nodes.find(function(n){return n.id===conn.from;});
    var tn = topo.nodes.find(function(n){return n.id===conn.to;});
    if (!fn || !tn) return;
    var line = document.createElementNS('http://www.w3.org/2000/svg','line');
    var fp = nodeCenter(fn);
    var tp = nodeCenter(tn);
    line.setAttribute('x1',fp.x); line.setAttribute('y1',fp.y);
    line.setAttribute('x2',tp.x); line.setAttribute('y2',tp.y);
    line.setAttribute('stroke',conn.color||'#C00000');
    line.setAttribute('stroke-width',conn.width||3);
    line.setAttribute('stroke-linecap','round');
    if (conn.style === 'dashed') {
      line.setAttribute('stroke-dasharray','8,4');
    }
    if (conn.style === 'arrow') {
      line.setAttribute('marker-end','url(#arrow-'+(conn.color||'#C00000').replace('#','')+')');
    }
    if (topo.selectedConnId === conn.id) {
      line.setAttribute('stroke-width', (conn.width||3) + 2);
    }
    svg.appendChild(line);
  });

  canvas.appendChild(svg);

  // ========== 选中线条的删除按钮 ==========
  if (topo.selectedConnId) {
    var sc = topo.connections.find(function(c){return c.id===topo.selectedConnId;});
    if (sc) {
      var sfn = topo.nodes.find(function(n){return n.id===sc.from;});
      var stn = topo.nodes.find(function(n){return n.id===sc.to;});
      if (sfn && stn) {
        var fp = nodeCenter(sfn);
        var tp = nodeCenter(stn);
        var mx = (fp.x + tp.x) / 2;
        var my = (fp.y + tp.y) / 2;
        var delBtn = document.createElement('div');
        delBtn.className = 'conn-delete-btn';
        delBtn.textContent = '×';
        delBtn.style.cssText = 'position:absolute;left:' + mx + 'px;top:' + my + 'px;z-index:15;';
        delBtn.addEventListener('click', function(e) { e.stopPropagation(); deleteSelectedConnection(); });
        canvas.appendChild(delBtn);
      }
    }
  }

  // ========== 区域层 ==========
  (topo.zones || []).forEach(function(zone) {
    var zEl = document.createElement('div');
    zEl.className = 'zone-item';
    zEl.style.cssText = 'position:absolute;left:' + zone.x + 'px;top:' + zone.y + 'px;width:' + zone.width + 'px;height:' + zone.height + 'px;border:2px dashed #C00000;border-radius:8px;background:' + (zone.bgColor || 'rgba(192,0,0,0.05)') + ';z-index:3;';
    if (topo.selectedZone === zone.id) {
      zEl.style.border = '2px solid #C00000';
    }
    // 标签
    var lbl = document.createElement('div');
    lbl.className = 'zone-label';
    lbl.textContent = zone.label || '';
    lbl.style.cssText = 'position:absolute;top:0;left:0;background:#C00000;color:white;padding:2px 10px;border-radius:6px 0 6px 0;font-size:12px;z-index:4;pointer-events:none;';
    zEl.appendChild(lbl);

    // 四角拖拽手柄（选中时）
    if (topo.selectedZone === zone.id) {
      ['nw','ne','sw','se'].forEach(function(corner) {
        var hdl = document.createElement('div');
        hdl.className = 'zone-resize ' + corner;
        hdl.style.cssText = 'position:absolute;width:10px;height:10px;background:white;border:1px solid #C00000;z-index:5;';
        if (corner === 'nw') hdl.style.cssText += 'top:-5px;left:-5px;cursor:nw-resize;';
        if (corner === 'ne') hdl.style.cssText += 'top:-5px;right:-5px;cursor:ne-resize;';
        if (corner === 'sw') hdl.style.cssText += 'bottom:-5px;left:-5px;cursor:sw-resize;';
        if (corner === 'se') hdl.style.cssText += 'bottom:-5px;right:-5px;cursor:se-resize;';
        hdl.addEventListener('mousedown', function(e) { e.stopPropagation(); startZoneResize(zone.id, corner, e); });
        zEl.appendChild(hdl);
      });
      // 删除按钮
      var delBtn = document.createElement('div');
      delBtn.className = 'zone-del-btn';
      delBtn.textContent = '×';
      delBtn.style.cssText = 'position:absolute;top:-10px;right:-10px;width:20px;height:20px;background:#C00000;color:white;border-radius:50%;text-align:center;line-height:18px;cursor:pointer;font-size:14px;z-index:6;';
      delBtn.addEventListener('click', function(e) { e.stopPropagation(); deleteZone(zone.id); });
      zEl.appendChild(delBtn);
    }

    zEl.addEventListener('mousedown', function(e) { e.stopPropagation(); selectZone(zone.id, e); });
    canvas.appendChild(zEl);
  });

  // ========== 节点层 ==========
  topo.nodes.forEach(function(node) {
    var el = document.createElement('div');
    var isSelected = topo.selectedNode === node.id || topo.multiSelected.indexOf(node.id) >= 0;
    var isConnectMode = topo.connectFrom && topo.connectFrom.nodeId !== node.id;
    el.className = 'node-item' + (isSelected ? ' node-selected' : '') + (isConnectMode ? ' connect-mode' : '');
    el.style.cssText = 'position:absolute;left:' + node.x + 'px;top:' + node.y + 'px;';
    el.dataset.nodeId = node.id;

    var icon = (window.TopologyIcons||TopologyIcons)[node.type];
    if (icon) {
      el.innerHTML = '<div style="width:45px;height:45px;margin:0 auto;color:#C00000;">'+icon.svg+'</div>'+
        '<div class="node-label">'+(node.label||icon.name)+'</div>';
    }

    // 锚点+删除按钮（选中/框选/连线模式的节点显示）
    if (isSelected || isConnectMode) {
      var anchorDirs = [
        { cls: 'a-top',  dir: 'top' },
        { cls: 'a-btm',  dir: 'btm' },
        { cls: 'a-lft',  dir: 'lft' },
        { cls: 'a-rgt',  dir: 'rgt' }
      ];
      anchorDirs.forEach(function(a) {
        var dot = document.createElement('div');
        dot.className = 'anchor ' + a.cls;
        dot.style.cssText = 'position:absolute;width:10px;height:10px;background:#C00000;border:2px solid white;border-radius:50%;z-index:10;cursor:crosshair;';
        dot.dataset.nodeId = node.id;
        dot.dataset.dir = a.dir;
        el.appendChild(dot);
      });
      // 删除按钮
      var delBtn = document.createElement('div');
      delBtn.className = 'node-del-btn';
      delBtn.textContent = '×';
      delBtn.style.cssText = 'position:absolute;top:-8px;right:-8px;width:18px;height:18px;background:#C00000;color:white;border-radius:50%;text-align:center;line-height:16px;cursor:pointer;font-size:12px;z-index:10;';
      delBtn.addEventListener('click', function(e) { e.stopPropagation(); deleteSelectedNode(); });
      el.appendChild(delBtn);
    }

    el.addEventListener('mousedown', function(e) {
      // 锚点点击 → 连线操作
      if (e.target.classList.contains('anchor')) {
        e.stopPropagation();
        handleAnchorClick(e);
        return;
      }
      // 删除/操作按钮 → 不触发选中和拖拽
      if (e.target.classList.contains('node-del-btn') || e.target.classList.contains('zone-del-btn') || e.target.tagName === 'BUTTON') {
        return;
      }
      e.stopPropagation();
      selectNode(node.id, e);
    });
    canvas.appendChild(el);
  });

  // ========== 渲染文本框 ==========
  topo.textBoxes.forEach(function(tb) {
    var isSel = topo.selectedTextBox === tb.id;
    var div = document.createElement('div');
    div.className = 'text-box' + (isSel ? ' text-box-sel' : '');
    div.style.cssText = 'position:absolute;left:'+tb.x+'px;top:'+tb.y+'px;font-size:14px;color:#333;'+
      'padding:8px;border:1px dashed '+(isSel?'#C00000':'transparent')+';cursor:move;user-select:none;z-index:15;'+
      'white-space:pre-wrap;background:rgba(255,255,255,0.9);';
    div.textContent = tb.text;
    // 点击选中
    div.addEventListener('click', function(e2) {
      topo.selectedTextBox = tb.id; topo.selectedNode = null; topo.selectedConnId = null;
      topo.selectedZone = null; topo.multiSelected = [];
      renderCanvas(); renderPropPanel();
      e2.stopPropagation();
    });
    // 拖动
    var sx, sy, ox, oy;
    div.addEventListener('mousedown', function(e2) {
      sx=e2.clientX; sy=e2.clientY; ox=tb.x; oy=tb.y;
      function mv(ev) {
        tb.x=ox+(ev.clientX-sx)/topo.zoom; tb.y=oy+(ev.clientY-sy)/topo.zoom;
        div.style.left=tb.x+'px'; div.style.top=tb.y+'px';
      }
      function up() { document.removeEventListener('mousemove',mv); document.removeEventListener('mouseup',up); saveHistory(); }
      document.addEventListener('mousemove',mv); document.addEventListener('mouseup',up);
      e2.stopPropagation();
    });
    canvas.appendChild(div);
  });

  updateInfo();
}

// ============== 锚点连线 ==============
function handleAnchorClick(e) {
  var nodeId = e.target.dataset.nodeId;
  if (topo.connectFrom && topo.connectFrom.nodeId === nodeId) {
    cancelConnection();
    return;
  }
  if (!topo.connectFrom) {
    // 第一步：进入连线模式
    var n = topo.nodes.find(function(x){return x.id===nodeId;});
    topo.selectedNode = nodeId;
    topo.connectFrom = { nodeId: nodeId, el: e.target };
    setStatus('🟢 已选起点，点击目标组件锚点连线（ESC取消）');
    renderCanvas();
  } else {
    // 第二步：完成连线
    var fromId = topo.connectFrom.nodeId;
    var toId = nodeId;
    if (fromId === toId) { cancelConnection(); return; }
    topo.connections.push({
      id: newConnId(),
      from: fromId,
      to: toId,
      color: '#C00000',
      width: 3,
      style: 'solid',
      bandwidth: '',
      description: ''
    });
    cancelConnection();
    saveHistory(); renderCanvas(); renderPropPanel();
  }
}

function connectMode(on) {
  var items = document.querySelectorAll('.node-item');
  for (var i = 0; i < items.length; i++) {
    if (on) items[i].classList.add('connect-mode');
    else items[i].classList.remove('connect-mode');
  }
}

function cancelConnection() {
  if (topo.connectFrom) { topo.connectFrom = null; }
  setStatus('');
  renderCanvas();
}

// 状态栏提示
function setStatus(msg) {
  var el = document.getElementById('connectionStatusText');
  if (el) el.textContent = msg || '';
  var bar = document.getElementById('connectionStatusBar');
  if (bar) bar.style.display = msg ? 'block' : 'none';
}

// ============== 节点选择与拖拽 ==============
function selectNode(nodeId, e) {
  if (e.ctrlKey || e.metaKey) {
    var idx = topo.multiSelected.indexOf(nodeId);
    if (idx >= 0) topo.multiSelected.splice(idx, 1);
    else topo.multiSelected.push(nodeId);
  } else {
    topo.selectedNode = nodeId;
    topo.multiSelected = [];
  }
  topo.selectedConnId = null; topo.selectedZone = null;
  renderCanvas(); renderPropPanel();

  // 拖拽
  var node = topo.nodes.find(function(n){return n.id===nodeId;});
  if (!node) return;
  var startX = e.clientX, startY = e.clientY;
  var origX = node.x, origY = node.y;
  var multiSnaps = topo.multiSelected.map(function(id) {
    var n = topo.nodes.find(function(nn){return nn.id===id;});
    return { id: id, x: n.x, y: n.y };
  });

  function onMove(ev) {
    var dx = (ev.clientX - startX) / topo.zoom;
    var dy = (ev.clientY - startY) / topo.zoom;
    if (topo.multiSelected.length > 0) {
      multiSnaps.forEach(function(ms) {
        var n = topo.nodes.find(function(nn){return nn.id===ms.id;});
        if (n) { n.x = ms.x + dx; n.y = ms.y + dy; }
      });
    } else {
      node.x = origX + dx; node.y = origY + dy;
    }
    renderCanvas();
  }
  function onUp() {
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
    saveHistory(); renderPropPanel();
  }
  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onUp);
}

// ============== 区域操作 ==============
function selectZone(zoneId, e) {
  topo.selectedZone = zoneId;
  topo.selectedNode = null; topo.selectedConnId = null; topo.multiSelected = [];
  renderCanvas(); renderPropPanel();

  var zone = topo.zones.find(function(z){return z.id===zoneId;});
  if (!zone) return;
  var startX = e.clientX, startY = e.clientY;
  var origX = zone.x, origY = zone.y;

  function onMove(ev) {
    var dx = (ev.clientX - startX) / topo.zoom;
    var dy = (ev.clientY - startY) / topo.zoom;
    zone.x = origX + dx; zone.y = origY + dy;
    renderCanvas();
  }
  function onUp() {
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
    saveHistory();
  }
  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onUp);
}

function startZoneResize(zoneId, corner, e) {
  var zone = topo.zones.find(function(z){return z.id===zoneId;});
  if (!zone) return;
  var startX = e.clientX, startY = e.clientY;
  var origX = zone.x, origY = zone.y, origW = zone.width, origH = zone.height;

  function onMove(ev) {
    var dx = (ev.clientX - startX) / topo.zoom;
    var dy = (ev.clientY - startY) / topo.zoom;
    if (corner.indexOf('e') >= 0) zone.width = Math.max(100, origW + dx);
    if (corner.indexOf('w') >= 0) { zone.x = origX + dx; zone.width = Math.max(100, origW - dx); }
    if (corner.indexOf('s') >= 0) zone.height = Math.max(80, origH + dy);
    if (corner.indexOf('n') >= 0) { zone.y = origY + dy; zone.height = Math.max(80, origH - dy); }
    renderCanvas();
  }
  function onUp() {
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
    saveHistory();
  }
  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onUp);
}

function deleteZone(zoneId) {
  topo.zones = topo.zones.filter(function(z){return z.id!==zoneId;});
  topo.selectedZone = null;
  saveHistory(); renderCanvas(); renderPropPanel();
}

function deleteNodeById(id) {
  topo.nodes = topo.nodes.filter(function(n){return n.id!==id;});
  topo.connections = topo.connections.filter(function(c){return c.from!==id && c.to!==id;});
}

// ============== 拖放添加节点 ==============
function setupDragDrop() {
  var canvas = document.getElementById('topologyCanvas');
  if (!canvas) return;

  canvas.addEventListener('dragover', function(e) { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; });
  canvas.addEventListener('drop', function(e) {
    e.preventDefault();
    var type = e.dataTransfer.getData('text/plain');
    var icon = (window.TopologyIcons||TopologyIcons)[type];
    if (!icon) return;
    var x = Math.round((e.offsetX - NODE_MIDX) / 20) * 20;
    var y = Math.round((e.offsetY - NODE_MIDY) / 20) * 20;
    if (icon.category === 'zone') {
      var zoneId = 'z' + Date.now();
      var zoneTypes = { serverZone: '服务器区', dmzZone: 'DMZ区', officeZone: '办公区', internetZone: '互联网区' };
      topo.zones.push({ id: zoneId, type: type, x: x, y: y, width: 300, height: 200, label: zoneTypes[type] || type, bgColor: '' });
      topo.selectedZone = zoneId;
    } else {
      var nodeId = 'n' + Date.now();
      topo.nodes.push({ id: nodeId, type: type, x: x, y: y, label: icon.name });
      topo.selectedNode = nodeId;
      topo.multiSelected = [];
    }
    saveHistory(); renderCanvas(); renderPropPanel();
  });
}

// ============== 键盘事件 ==============
function setupKeyboard() {
  document.addEventListener('keydown', function(e) {
    // 如果焦点在输入框内，不触发画布快捷键
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
    if (e.key === 'Delete' || e.key === 'Backspace') {
      if (topo.selectedConnId) { deleteSelectedConnection(); return; }
      if (topo.selectedNode || topo.multiSelected.length) { deleteSelectedNode(); return; }
      if (topo.selectedZone) { deleteZone(topo.selectedZone); return; }
      if (topo.selectedTextBox) {
        topo.textBoxes = topo.textBoxes.filter(function(t){return t.id!==topo.selectedTextBox;});
        topo.selectedTextBox = null; saveHistory(); renderCanvas(); return;
      }
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); undo(); }
    if ((e.ctrlKey || e.metaKey) && e.key === 'y') { e.preventDefault(); redo(); }
    if (e.key === 'Escape') { topo.connectFrom = null; renderCanvas(); }
  });
}

// ============== 历史记录 ==============
function saveHistory() {
  topo.history = topo.history.slice(0, topo.historyIdx + 1);
  topo.history.push(JSON.parse(JSON.stringify({
    nodes: topo.nodes, connections: topo.connections, zones: topo.zones, textBoxes: topo.textBoxes
  })));
  topo.historyIdx = topo.history.length - 1;
  if (topo.history.length > 50) { topo.history.shift(); topo.historyIdx--; }
  updateToolbar();
}

function undo() {
  if (topo.historyIdx <= 0) return;
  topo.historyIdx--;
  var snap = topo.history[topo.historyIdx];
  topo.nodes = snap.nodes; topo.connections = snap.connections; topo.zones = snap.zones || [];
  topo.selectedNode = null; topo.selectedConnId = null; topo.selectedZone = null; topo.multiSelected = [];
  renderCanvas(); renderPropPanel(); updateToolbar();
}

function redo() {
  if (topo.historyIdx >= topo.history.length - 1) return;
  topo.historyIdx++;
  var snap = topo.history[topo.historyIdx];
  topo.nodes = snap.nodes; topo.connections = snap.connections; topo.zones = snap.zones || [];
  topo.selectedNode = null; topo.selectedConnId = null; topo.selectedZone = null; topo.multiSelected = [];
  renderCanvas(); renderPropPanel(); updateToolbar();
}

function updateToolbar() {
  var ub = document.getElementById('undoBtn');
  var rb = document.getElementById('redoBtn');
  if (ub) ub.disabled = topo.historyIdx <= 0;
  if (rb) rb.disabled = topo.historyIdx >= topo.history.length - 1;
}

// ============== 属性面板 ==============
function renderPropPanel() {
  var nodePanel = document.getElementById('nodeProperties');
  var connPanel = document.getElementById('connectionProperties');
  var zonePanel = document.getElementById('zoneProperties');

  // 隐藏所有面板
  if (nodePanel) nodePanel.style.display = 'none';
  if (connPanel) connPanel.style.display = 'none';
  if (zonePanel) zonePanel.style.display = 'none';

  // 节点属性
  if (topo.selectedNode) {
    var node = topo.nodes.find(function(n){return n.id===topo.selectedNode;});
    if (node && nodePanel) {
      nodePanel.style.display = 'block';
      var ne = document.getElementById('propName');
      var te = document.getElementById('propType');
      if (ne) ne.value = node.label || '';
      if (te) {
        var icon = (window.TopologyIcons||TopologyIcons)[node.type];
        te.value = icon ? icon.name : node.type;
      }
    }
    return;
  }

  // 连线属性
  if (topo.selectedConnId) {
    var conn = topo.connections.find(function(c){return c.id===topo.selectedConnId;});
    if (conn && connPanel) {
      connPanel.style.display = 'block';
      var ce = document.getElementById('connColor');
      var we = document.getElementById('connWidth');
      var se = document.getElementById('connStyle');
      var be = document.getElementById('connBandwidth');
      var de = document.getElementById('connDescription');
      if (ce) ce.value = conn.color || '#C00000';
      if (we) we.value = conn.width || 3;
      if (se) se.value = conn.style || 'solid';
      if (be) be.value = conn.bandwidth || '';
      if (de) de.value = conn.description || '';
    }
    return;
  }

  // 区域属性
  if (topo.selectedZone) {
    var zone = topo.zones.find(function(z){return z.id===topo.selectedZone;});
    if (zone && zonePanel) {
      zonePanel.style.display = 'block';
      var zn = document.getElementById('zoneName');
      var zb = document.getElementById('zoneBgColor');
      if (zn) zn.value = zone.label || '';
      if (zb) zb.value = zone.bgColor || '';
    }
    return;
  }
}

function applyZoneProperties() {
  var zone = topo.zones.find(function(z){return z.id===topo.selectedZone;});
  if (!zone) return;
  var ne = document.getElementById('zoneName');
  var zb = document.getElementById('zoneBgColor');
  if (ne) zone.label = ne.value;
  if (zb) zone.bgColor = zb.value;
  saveHistory(); renderCanvas(); renderPropPanel();
}

// 区域颜色选择
window.selectZoneColor = function(el) {
  var zb = document.getElementById('zoneBgColor');
  if (zb) zb.value = el.dataset.color;
  applyZoneProperties();
};

// ============== 缩放 ==============
function zoomIn() { topo.zoom = Math.min(2.0, topo.zoom + 0.15); renderCanvas(); updateZoomLabel(); }
function zoomOut() { topo.zoom = Math.max(0.3, topo.zoom - 0.15); renderCanvas(); updateZoomLabel(); }
function updateZoomLabel() { var el=document.getElementById('zoomLevel'); if(el)el.textContent=Math.round(topo.zoom*100)+'%'; }
function toggleGrid() { topo.gridOn=!topo.gridOn; renderCanvas(); }
function goBack() { window.location.href = '/'; }

// ============== 按钮绑定 ==============
function bindButtons() {
  (document.getElementById('undoBtn')||{}).onclick = undo;
  (document.getElementById('redoBtn')||{}).onclick = redo;
  (document.getElementById('zoomInBtn')||{}).onclick = zoomIn;
  (document.getElementById('zoomOutBtn')||{}).onclick = zoomOut;
  (document.getElementById('gridToggleBtn')||{}).onclick = toggleGrid;
}

// ============== 全局 ==============
function updateInfo() {
  var nc=document.getElementById('nodeCount'), cc=document.getElementById('connectionCount');
  var sc=document.getElementById('securityProductCount');
  if (nc) nc.textContent = topo.nodes.length;
  if (cc) cc.textContent = topo.connections.length;
  if (sc) sc.textContent = topo.nodes.filter(function(n) { var icon = (window.TopologyIcons||TopologyIcons)[n.type]; return icon && icon.category === 'security'; }).length;
}
function loadTemplate() {
  // 优先从 localStorage 加载已保存的拓扑
  var saved = localStorage.getItem('topology_data');
  if (saved) {
    try {
      var d = JSON.parse(saved);
      if (d.nodes && d.nodes.length) {
        topo.nodes = deepClone(d.nodes);
        topo.connections = deepClone(d.connections || []);
        topo.zones = deepClone(d.zones || []);
        topo.textBoxes = deepClone(d.textBoxes || []);
        topo.connections.forEach(function(c) { if (!c.id) c.id = newConnId(); });
        saveHistory(); renderCanvas(); renderPropPanel();
        return;
      }
    } catch(e) {
      console.warn('加载已保存拓扑失败，使用默认模板:', e.message);
    }
  }
  // 没有保存数据时使用默认模板
  var t = (window.TopologyTemplates||TopologyTemplates) ? TopologyTemplates['three-tier'] : null;
  if (t) {
    topo.nodes = deepClone(t.nodes);
    topo.connections = deepClone(t.connections);
    topo.zones = deepClone(t.zones||[]);
    topo.connections.forEach(function(c) { if (!c.id) c.id = newConnId(); });
  }
  saveHistory(); renderCanvas(); renderPropPanel();
}
function clearTopology() {
  if (!confirm('清空画布？')) return;
  topo.nodes=[]; topo.connections=[]; topo.zones=[];
  topo.selectedNode=null; topo.selectedConnId=null; topo.selectedZone=null; topo.multiSelected=[];
  saveHistory(); renderCanvas(); renderPropPanel();
}

function deepClone(obj) { return JSON.parse(JSON.stringify(obj)); }

// ============== 拓扑图导出（SVG → Canvas → PNG）==============

/**
 * 生成完整的拓扑 SVG 字符串（内联所有图标，自包含）
 * 用于可靠地转换为 PNG，避免外部图片加载问题
 */

// XML 转义辅助函数
function xmlEscape(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function generateTopologySVG() {
  var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  topo.nodes.forEach(function(n) {
    if (n.x < minX) minX = n.x; if (n.y < minY) minY = n.y;
    if (n.x + NODE_W > maxX) maxX = n.x + NODE_W;
    if (n.y + NODE_H > maxY) maxY = n.y + NODE_H;
  });
  (topo.zones || []).forEach(function(z) {
    if (z.x < minX) minX = z.x; if (z.y < minY) minY = z.y;
    if (z.x + z.width > maxX) maxX = z.x + z.width;
    if (z.y + z.height > maxY) maxY = z.y + z.height;
  });
  if (!isFinite(minX)) { minX = 0; minY = 0; maxX = 800; maxY = 600; }
  var pad = 30;
  var offX = minX - pad, offY = minY - pad;
  var w = Math.max(200, maxX - minX + pad * 2);
  var h = Math.max(200, maxY - minY + pad * 2);
  function tx(vx) { return vx - offX; }
  function ty(vy) { return vy - offY; }

  var parts = [];
  parts.push('<svg xmlns="http://www.w3.org/2000/svg" width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '">');
  parts.push('<rect width="' + w + '" height="' + h + '" fill="white"/>');

  // 1. 区域层
  var zoneHeaderColors = { serverZone:'#1890ff', dmzZone:'#fa8c16', officeZone:'#52c41a', internetZone:'#13c2c2' };
  var zoneBgColors = { serverZone:'#e6f7ff', dmzZone:'#fff3e0', officeZone:'#f0fff0', internetZone:'#e8f4fd' };
  (topo.zones || []).forEach(function(z) {
    var bg = z.bgColor || zoneBgColors[z.type] || '#f5f5f5';
    parts.push('<rect x="' + tx(z.x) + '" y="' + ty(z.y) + '" width="' + z.width + '" height="' + z.height + '" rx="8" fill="' + bg + '" stroke="#C00000" stroke-width="2" stroke-dasharray="6,3"/>');
    var lbl = z.label || '';
    if (lbl) {
      var hdrC = zoneHeaderColors[z.type] || '#C00000';
      var lblW = Math.min(z.width, Math.max(60, lbl.length * 9 + 24));
      parts.push('<rect x="' + tx(z.x) + '" y="' + ty(z.y) + '" width="' + lblW + '" height="24" rx="6" fill="' + hdrC + '"/>');
      parts.push('<text x="' + (tx(z.x) + 10) + '" y="' + (ty(z.y) + 17) + '" font-size="12" fill="white" font-family="sans-serif">' + xmlEscape(lbl) + '</text>');
    }
  });

  // 2. 连线层
  topo.connections.forEach(function(conn) {
    var fn = topo.nodes.find(function(n){return n.id===conn.from;});
    var tn = topo.nodes.find(function(n){return n.id===conn.to;});
    if (!fn || !tn) return;
    var fp = nodeCenter(fn), tp = nodeCenter(tn);
    var dashAttr = conn.style === 'dashed' ? ' stroke-dasharray="8,4"' : '';
    parts.push('<line x1="' + tx(fp.x) + '" y1="' + ty(fp.y) + '" x2="' + tx(tp.x) + '" y2="' + ty(tp.y) + '" stroke="' + (conn.color||'#C00000') + '" stroke-width="' + (conn.width||3) + '" stroke-linecap="round"' + dashAttr + '/>');
  });

  // 3. 节点层（内联图标）
  topo.nodes.forEach(function(node) {
    var nx = tx(node.x), ny = ty(node.y);
    // 节点背景
    parts.push('<rect x="' + nx + '" y="' + ny + '" width="' + NODE_W + '" height="' + NODE_H + '" rx="6" fill="white" stroke="#C00000" stroke-width="2"/>');
    // 内嵌图标 SVG
    var icon = (window.TopologyIcons || TopologyIcons)[node.type];
    if (icon) {
      var icoSvg = icon.svg
        .replace(/currentColor/g, '#C00000')
        .replace('<svg viewBox=', '<svg x="' + (nx + 27.5) + '" y="' + (ny + 6) + '" width="45" height="45" viewBox=');
      // 确保 xmlns 存在
      if (icoSvg.indexOf('xmlns=') === -1) {
        icoSvg = icoSvg.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
      }
      parts.push(icoSvg);
    }
    // 标签文字
    var lbl = node.label || (icon ? icon.name : '');
    parts.push('<text x="' + (nx + NODE_MIDX) + '" y="' + (ny + NODE_H - 6) + '" font-size="11" fill="#333" text-anchor="middle" font-family="sans-serif">' + xmlEscape(lbl) + '</text>');
  });

  // 4. 文字标注层
  (topo.textBoxes || []).forEach(function(tb) {
    parts.push('<text x="' + (tx(tb.x) + 4) + '" y="' + (ty(tb.y) + 18) + '" font-size="14" fill="#333" font-family="sans-serif">' + xmlEscape(tb.text) + '</text>');
  });

  parts.push('</svg>');
  return parts.join('');
}

/**
 * 将拓扑图转换为 PNG base64 数据 URL
 * 通过生成完整内联 SVG → Image → Canvas → PNG，确保 100% 可靠性
 * @param {function} callback - 回调函数，参数为 data URL 字符串或 null
 */
function topologyToImage(callback) {
  try {
    var svgStr = generateTopologySVG();
    var svgBlob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
    var url = URL.createObjectURL(svgBlob);
    var img = new Image();
    var done = false;
    // 10秒超时保护
    var timeout = setTimeout(function() {
      if (!done) {
        done = true;
        URL.revokeObjectURL(url);
        console.error('[拓扑截图] 超时（10秒未加载完成）');
        callback(null);
      }
    }, 10000);
    img.onload = function() {
      if (done) return; done = true; clearTimeout(timeout);
      try {
        var cvs = document.createElement('canvas');
        var w = img.naturalWidth, h = img.naturalHeight;
        // 缩放至最大 2000px
        var maxDim = 2000;
        if (w > maxDim || h > maxDim) {
          var ratio = Math.min(maxDim / w, maxDim / h);
          w = Math.round(w * ratio);
          h = Math.round(h * ratio);
        }
        cvs.width = w; cvs.height = h;
        // 使用 {alpha:false} 生成 RGB PNG，避免 Word 兼容性问题
        var ctx = cvs.getContext('2d', { alpha: false });
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        URL.revokeObjectURL(url);
        console.log('[拓扑截图] 成功，尺寸:', w + 'x' + h);
        callback(cvs.toDataURL('image/png'));
      } catch (e) {
        URL.revokeObjectURL(url);
        console.error('[拓扑截图] Canvas绘制失败:', e);
        callback(null);
      }
    };
    img.onerror = function(e) {
      if (done) return; done = true; clearTimeout(timeout);
      URL.revokeObjectURL(url);
      console.error('[拓扑截图] SVG图片加载失败:', e);
      callback(null);
    };
    img.src = url;
  } catch (e) {
    console.error('[拓扑截图] 生成异常:', e);
    callback(null);
  }
}

function saveTopology() {
  var d = {nodes: deepClone(topo.nodes), connections: deepClone(topo.connections), zones: deepClone(topo.zones || []), textBoxes: deepClone(topo.textBoxes || [])};
  localStorage.setItem('topology_data', JSON.stringify(d));
  console.log('[拓扑保存] JSON 数据已保存，节点数:', topo.nodes.length, '连线数:', topo.connections.length, '文本框数:', topo.textBoxes.length);

  // 生成真实截图并双保险保存到 localStorage（跨页面共享）
  topologyToImage(function(dataUrl) {
    if (dataUrl) {
      // 双重保存：单独key + 嵌入topology_data（防止单独key丢失）
      localStorage.setItem('topology_image', dataUrl);
      d.image = dataUrl;
      try {
        localStorage.setItem('topology_data', JSON.stringify(d));
      } catch(e) {
        console.warn('[拓扑保存] topology_data含图片太大，仅保存单独key:', e.message);
      }
      console.log('[拓扑保存] 截图已生成并保存，大小:', Math.round(dataUrl.length / 1024), 'KB');
      alert('拓扑已保存！截图已生成，可在方案架构中查看。');
    } else {
      console.error('[拓扑保存] 截图生成失败！');
      alert('拓扑数据已保存，但截图生成失败。请检查浏览器控制台。');
    }
    // 同步到服务端
    var payload = {nodes: d.nodes, connections: d.connections, zones: d.zones, textBoxes: d.textBoxes, image: dataUrl || null};
    fetch('/api/save-topology', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload)}).catch(function(e){ console.log('[拓扑保存] 服务端同步失败（如使用Netlify可忽略）:', e.message); });
  });
}

function exportTopology() {
  var svgParts = [];
  svgParts.push('<svg xmlns="http://www.w3.org/2000/svg" width="4000" height="3000" viewBox="0 0 4000 3000">');
  svgParts.push('<defs>');
  svgParts.push('<marker id="arrow-C00000" markerWidth="10" markerHeight="10" refX="9" refY="5" orient="auto"><path d="M0,0 L10,5 L0,10 Z" fill="#C00000"/></marker>');
  svgParts.push('<marker id="arrow-333333" markerWidth="10" markerHeight="10" refX="9" refY="5" orient="auto"><path d="M0,0 L10,5 L0,10 Z" fill="#333333"/></marker>');
  svgParts.push('<marker id="arrow-2196F3" markerWidth="10" markerHeight="10" refX="9" refY="5" orient="auto"><path d="M0,0 L10,5 L0,10 Z" fill="#2196F3"/></marker>');
  svgParts.push('<style>.node-rect{fill:white;stroke:#C00000;stroke-width:2;rx:8}.node-label{font-size:12px;fill:#333;text-anchor:middle;font-family:sans-serif}.zone-rect{stroke:#C00000;stroke-width:2;stroke-dasharray:8,4;rx:8}.zone-label{font-size:13px;fill:white;font-family:sans-serif;font-weight:bold}</style></defs>');

  // 区域层
  if (topo.zones) {
    topo.zones.forEach(function(z) {
      svgParts.push('<rect class="zone-rect" fill="'+z.bgColor+'" x="'+z.x+'" y="'+z.y+'" width="'+z.width+'" height="'+z.height+'"/>');
      var hdrColor = ({serverZone:'#1890ff',dmzZone:'#fa8c16',officeZone:'#52c41a',internetZone:'#13c2c2'})[z.type]||'#C00000';
      svgParts.push('<rect fill="'+hdrColor+'" x="'+z.x+'" y="'+z.y+'" width="'+Math.max(z.width,80)+'" height="26" rx="8"/>');
      svgParts.push('<rect fill="'+hdrColor+'" x="'+z.x+'" y="'+(z.y+18)+'" width="'+Math.max(z.width,80)+'" height="8"/>');
      svgParts.push('<text class="zone-label" x="'+(z.x+12)+'" y="'+(z.y+18)+'">'+xmlEscape(z.label)+'</text>');
    });
  }

  // 连线层
  topo.connections.forEach(function(conn) {
    var fn = topo.nodes.find(function(n){return n.id===conn.from;});
    var tn = topo.nodes.find(function(n){return n.id===conn.to;});
    if (!fn || !tn) return;
    var fp = nodeCenter(fn), tp = nodeCenter(tn);
    var dash = conn.style === 'dashed' ? ' stroke-dasharray="8,4"' : '';
    var arrow = conn.style === 'arrow' ? ' marker-end="url(#arrow-'+(conn.color||'#C00000').replace('#','')+')"' : '';
    svgParts.push('<line x1="'+fp.x+'" y1="'+fp.y+'" x2="'+tp.x+'" y2="'+tp.y+'" stroke="'+(conn.color||'#C00000')+'" stroke-width="'+(conn.width||3)+'" stroke-linecap="round"'+dash+arrow+'/>');
    if (conn.bandwidth) {
      var mx=(fp.x+tp.x)/2, my=(fp.y+tp.y)/2;
      svgParts.push('<rect fill="white" x="'+(mx-30)+'" y="'+(my-10)+'" width="60" height="18" rx="3"/>');
      svgParts.push('<text text-anchor="middle" font-size="10" fill="#333" x="'+mx+'" y="'+(my+3)+'">'+xmlEscape(conn.bandwidth)+'</text>');
    }
  });

  // 节点层（红色边框+图标+标签）
  topo.nodes.forEach(function(node) {
    var icon = (window.TopologyIcons||TopologyIcons)[node.type];
    svgParts.push('<rect class="node-rect" x="'+node.x+'" y="'+node.y+'" width="'+NODE_W+'" height="'+NODE_H+'"/>');
    // 嵌入SVG图标（修复 currentColor 和 xmlns）
    if (icon) {
      var icoSvg = icon.svg
        .replace(/currentColor/g, '#C00000')
        .replace('<svg viewBox=', '<svg x="'+(node.x+30)+'" y="'+(node.y+8)+'" width="45" height="45" viewBox=');
      if (icoSvg.indexOf('xmlns=') === -1) {
        icoSvg = icoSvg.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
      }
      svgParts.push(icoSvg);
    }
    svgParts.push('<text class="node-label" x="'+(node.x+NODE_MIDX)+'" y="'+(node.y+NODE_H-10)+'">'+xmlEscape(node.label||icon.name)+'</text>');
  });

  // 文本框层
  if (topo.textBoxes) {
    topo.textBoxes.forEach(function(tb) {
      svgParts.push('<text x="'+(tb.x+4)+'" y="'+(tb.y+18)+'" font-size="14" fill="#333" font-family="sans-serif">'+tb.text+'</text>');
    });
  }

  svgParts.push('</svg>');
  var blob = new Blob([svgParts.join('')], {type:'image/svg+xml'});
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = '拓扑图.svg'; a.click();
}
function handleTemplateChange(val) {
  if (!val) return;
  if (val==='three-tier' && (window.TopologyTemplates||TopologyTemplates)) {
    topo.nodes = deepClone(TopologyTemplates['three-tier'].nodes);
    topo.connections = deepClone(TopologyTemplates['three-tier'].connections);
    topo.zones = deepClone(TopologyTemplates['three-tier'].zones||[]);
    topo.textBoxes = deepClone(TopologyTemplates['three-tier'].textBoxes||[]);
    topo.connections.forEach(function(c) { if (!c.id) c.id = newConnId(); });
    topo.selectedZone = null;
    saveHistory(); renderCanvas(); renderPropPanel();
  }
  if (val.startsWith('saved:')) {
    var name = val.substring(6);
    var ts = JSON.parse(localStorage.getItem('saved_templates')||'{}');
    if (ts[name]) {
      topo.nodes = deepClone(ts[name].nodes||[]);
      topo.connections = deepClone(ts[name].connections||[]);
      topo.zones = deepClone(ts[name].zones||[]);
      topo.textBoxes = deepClone(ts[name].textBoxes||[]);
      topo.connections.forEach(function(c) { if (!c.id) c.id = newConnId(); });
      topo.selectedNode = null; topo.selectedConnId = null; topo.selectedZone = null; topo.multiSelected = [];
      saveHistory(); renderCanvas(); renderPropPanel();
    }
  }
  var delBtn = document.getElementById('deleteTemplateBtn');
  if (delBtn) delBtn.style.display = val.startsWith('saved:') ? 'inline-block' : 'none';
}
function saveCurrentAsTemplate() {
  var n = prompt('模板名称：','自定义拓扑');
  if (!n) return;
  var ts = JSON.parse(localStorage.getItem('saved_templates')||'{}');
  ts[n] = {nodes:deepClone(topo.nodes), connections:deepClone(topo.connections), zones:deepClone(topo.zones||[]), textBoxes:deepClone(topo.textBoxes||[])};
  localStorage.setItem('saved_templates', JSON.stringify(ts));
  updateTemplateSelect();
}
function updateTemplateSelect() {
  var g = document.getElementById('savedTemplatesGroup');
  if (!g) return;
  var ts = JSON.parse(localStorage.getItem('saved_templates')||'{}');
  g.innerHTML = Object.keys(ts).map(function(n){return '<option value="saved:'+n+'">💾 '+n+'</option>';}).join('');
}
function deleteCurrentTemplate() {
  var sel = document.getElementById('topologyTemplate');
  var val = sel.value;
  if (!val || !val.startsWith('saved:')) return;
  var name = val.substring(6);
  if (!confirm('删除模板 "'+name+'"？')) return;
  var ts = JSON.parse(localStorage.getItem('saved_templates')||'{}');
  delete ts[name];
  localStorage.setItem('saved_templates', JSON.stringify(ts));
  sel.value = '';
  document.getElementById('deleteTemplateBtn').style.display = 'none';
  updateTemplateSelect();
}
function deleteSelectedNode() {
  var ids = topo.multiSelected.length>0 ? topo.multiSelected.slice() : (topo.selectedNode ? [topo.selectedNode] : []);
  if (!ids.length || !confirm('删除 '+ids.length+' 个节点？')) return;
  ids.forEach(function(id){ deleteNodeById(id); });
  topo.multiSelected = []; topo.selectedConnId = null;
  saveHistory(); renderCanvas(); renderPropPanel();
}
function deleteSelectedConnection() {
  if (!topo.selectedConnId) return;
  topo.connections = topo.connections.filter(function(c){return c.id!==topo.selectedConnId;});
  topo.selectedConnId = null; saveHistory(); renderCanvas(); renderPropPanel();
}
function applyProperties() {
  var n = topo.nodes.find(function(x){return x.id===topo.selectedNode;});
  if (!n) return;
  var ne=document.getElementById('propName');
  if (ne) n.label = ne.value;
  // 类型字段只读显示，不允许修改（避免图标名覆盖 type 键名）
  saveHistory(); renderCanvas(); renderPropPanel();
}
function applyConnectionProperties() {
  if (!topo.selectedConnId) return;
  var c = topo.connections.find(function(x){return x.id===topo.selectedConnId;});
  if (!c) return;
  var ce=document.getElementById('connColor'), we=document.getElementById('connWidth'), se=document.getElementById('connStyle');
  var be=document.getElementById('connBandwidth'), de=document.getElementById('connDescription');
  if (ce) c.color = ce.value;
  if (we) c.width = parseInt(we.value);
  if (se) c.style = se.value;
  if (be) c.bandwidth = be.value;
  if (de) c.description = de.value;
  saveHistory(); renderCanvas(); renderPropPanel();
}

document.addEventListener('DOMContentLoaded', function() {
  initEditor();
  updateTemplateSelect();
  renderPropPanel();
  bindButtons();
  // 如果已有拓扑数据但没有截图，自动重新生成
  autoRegenerateImage();
  // 记录访问统计
  topoRecordVisit();
});

// 自动检测并重新生成拓扑截图（解决旧代码生成图片失败的问题）
function autoRegenerateImage() {
  var topoDataStr = localStorage.getItem('topology_data');
  var topoImg = localStorage.getItem('topology_image');
  if (topoDataStr && topo.nodes.length > 0 && !topoImg) {
    console.log('[自动修复] 检测到拓扑数据但没有截图，自动重新生成...');
    topologyToImage(function(dataUrl) {
      if (dataUrl) {
        localStorage.setItem('topology_image', dataUrl);
        // 同步保存到 topology_data
        try {
          var d = JSON.parse(localStorage.getItem('topology_data') || '{}');
          d.image = dataUrl;
          localStorage.setItem('topology_data', JSON.stringify(d));
        } catch(e) {}
        console.log('[自动修复] 拓扑截图已重新生成，大小:', Math.round(dataUrl.length / 1024), 'KB');
      }
    });
  }
}

// ============== 访问统计埋点 ==============
function topoGetSessionId() {
  var sid = localStorage.getItem('stats_session_id');
  if (!sid) {
    sid = 'sess_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
    localStorage.setItem('stats_session_id', sid);
  }
  return sid;
}

function topoRecordVisit() {
  var payload = {
    page: 'topology',
    sessionId: topoGetSessionId(),
    referrer: document.referrer || ''
  };
  try {
    var xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/stats/record', true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.send(JSON.stringify(payload));
  } catch(e) {}
  // localStorage 兜底
  try {
    var visits = JSON.parse(localStorage.getItem('stats_visits') || '[]');
    visits.push({ page: 'topology', sessionId: topoGetSessionId(), timestamp: Date.now() });
    if (visits.length > 500) visits.splice(0, visits.length - 500);
    localStorage.setItem('stats_visits', JSON.stringify(visits));
  } catch(e) {}
}
