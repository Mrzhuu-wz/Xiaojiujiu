/**
 * 网络拓扑场景化模板
 * 预设企业三层网络结构
 */

const TopologyTemplates = {
  'three-tier': {
    name: '企业三层网络结构',
    description: '经典的企业网络架构：互联网-路由器-核心交换机（分叉连接办公区和服务器区域）',
    nodes: [
      { id: 'internet', type: 'internet', x: 350, y: 30, name: '互联网', label: '互联网' },
      { id: 'router', type: 'router', x: 350, y: 160, name: '路由器', label: '路由器' },
      { id: 'switch-core', type: 'switch', x: 350, y: 290, name: '核心交换机', label: '核心交换机' },
      { id: 'switch-office', type: 'switch', x: 150, y: 430, name: '办公区交换机', label: '办公区' },
      { id: 'switch-server', type: 'switch', x: 550, y: 430, name: '服务器区交换机', label: '服务器区' },
      { id: 'pc-1', type: 'pc', x: 100, y: 570, name: '办公PC-1', label: '办公PC' },
      { id: 'pc-2', type: 'pc', x: 200, y: 570, name: '办公PC-2', label: '办公PC' },
      { id: 'server-web', type: 'server', x: 480, y: 570, name: 'Web服务器', label: 'Web服务器' },
      { id: 'server-app', type: 'server', x: 600, y: 570, name: '应用服务器', label: '应用服务器' }
    ],
    connections: [
      { id: 'conn1', from: 'internet', to: 'router', type: 'internet', bandwidth: '1000Mbps', label: '互联网接入' },
      { id: 'conn2', from: 'router', to: 'switch-core', type: '专线', bandwidth: '10Gbps', label: '骨干链路' },
      { id: 'conn3', from: 'switch-core', to: 'switch-office', type: '专线', bandwidth: '1Gbps', label: '办公区' },
      { id: 'conn4', from: 'switch-core', to: 'switch-server', type: '专线', bandwidth: '1Gbps', label: '服务器区' },
      { id: 'conn5', from: 'switch-office', to: 'pc-1', type: '数据流', bandwidth: '100Mbps', label: '' },
      { id: 'conn6', from: 'switch-office', to: 'pc-2', type: '数据流', bandwidth: '100Mbps', label: '' },
      { id: 'conn7', from: 'switch-server', to: 'server-web', type: '数据流', bandwidth: '1Gbps', label: '' },
      { id: 'conn8', from: 'switch-server', to: 'server-app', type: '数据流', bandwidth: '1Gbps', label: '' }
    ]
  }
};

function saveCustomTemplate(name, description) {
  const customId = 'custom-' + Date.now();
  TopologyTemplates[customId] = {
    name: name,
    description: description || '自定义拓扑模板',
    nodes: JSON.parse(JSON.stringify(topologyData.nodes)),
    connections: JSON.parse(JSON.stringify(topologyData.connections))
  };
  
  const savedTemplates = JSON.parse(localStorage.getItem('customTemplates') || '[]');
  savedTemplates.push({ id: customId, name, description });
  localStorage.setItem('customTemplates', JSON.stringify(savedTemplates));
  
  return customId;
}

function loadCustomTemplates() {
  const savedTemplates = JSON.parse(localStorage.getItem('customTemplates') || '[]');
  savedTemplates.forEach(tpl => {
    if (!TopologyTemplates[tpl.id]) {
      TopologyTemplates[tpl.id] = {
        name: tpl.name,
        description: tpl.description,
        nodes: [],
        connections: []
      };
    }
  });
  return savedTemplates;
}
