/**
 * 网络拓扑图标库 - 中国电信统一风格
 */

const TopologyIcons = {
  // ==================== 基础网络设备 ====================

  // 路由器
  router: {
    name: '路由器',
    category: 'network',
    color: '#666666',
    width: 70,
    height: 60,
    svg: `<svg viewBox="0 0 70 60" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="5" y="15" width="60" height="30" rx="3" stroke="currentColor" stroke-width="2" fill="white"/>
      <circle cx="18" cy="30" r="4" stroke="currentColor" stroke-width="2" fill="white"/>
      <circle cx="35" cy="30" r="4" stroke="currentColor" stroke-width="2" fill="white"/>
      <circle cx="52" cy="30" r="4" stroke="currentColor" stroke-width="2" fill="white"/>
      <circle cx="60" cy="20" r="3" fill="currentColor"/>
    </svg>`
  },

  // 交换机
  switch: {
    name: '交换机',
    category: 'network',
    color: '#666666',
    width: 70,
    height: 50,
    svg: `<svg viewBox="0 0 70 50" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="5" y="10" width="60" height="30" rx="2" stroke="currentColor" stroke-width="2" fill="white"/>
      <rect x="12" y="18" width="6" height="6" rx="1" stroke="currentColor" stroke-width="1.5" fill="white"/>
      <rect x="22" y="18" width="6" height="6" rx="1" stroke="currentColor" stroke-width="1.5" fill="white"/>
      <rect x="32" y="18" width="6" height="6" rx="1" stroke="currentColor" stroke-width="1.5" fill="white"/>
      <rect x="42" y="18" width="6" height="6" rx="1" stroke="currentColor" stroke-width="1.5" fill="white"/>
      <rect x="52" y="18" width="6" height="6" rx="1" stroke="currentColor" stroke-width="1.5" fill="white"/>
    </svg>`
  },

  // 服务器
  server: {
    name: '服务器',
    category: 'network',
    color: '#666666',
    width: 60,
    height: 70,
    svg: `<svg viewBox="0 0 60 70" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="5" y="5" width="50" height="60" rx="3" stroke="currentColor" stroke-width="2" fill="white"/>
      <line x1="5" y1="25" x2="55" y2="25" stroke="currentColor" stroke-width="1.5"/>
      <line x1="5" y1="45" x2="55" y2="45" stroke="currentColor" stroke-width="1.5"/>
      <circle cx="15" cy="15" r="3" fill="currentColor"/>
      <rect x="22" y="12" width="20" height="4" rx="1" stroke="currentColor" stroke-width="1.5" fill="white"/>
    </svg>`
  },

  // 办公PC
  pc: {
    name: '办公PC',
    category: 'network',
    color: '#666666',
    width: 60,
    height: 65,
    svg: `<svg viewBox="0 0 60 65" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="8" y="8" width="44" height="32" rx="2" stroke="currentColor" stroke-width="2" fill="white"/>
      <rect x="12" y="12" width="36" height="24" stroke="currentColor" stroke-width="1" fill="white"/>
      <path d="M18 40 L18 50 L42 50 L42 40" stroke="currentColor" stroke-width="2"/>
      <line x1="30" y1="50" x2="30" y2="55" stroke="currentColor" stroke-width="2"/>
      <line x1="22" y1="55" x2="38" y2="55" stroke="currentColor" stroke-width="2"/>
    </svg>`
  },

  // ==================== 中国电信安全产品 - 8款统一电信红风格 ====================

  // 1. 天翼安全大脑 - 雷达/态势感知
  brain: {
    name: '天翼安全大脑',
    category: 'security',
    productId: 'C01_PROTECT',
    color: '#C00000',
    width: 70, height: 70,
    svg: `<svg viewBox="0 0 70 70" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="10" y="12" width="50" height="46" rx="4" stroke="currentColor" stroke-width="2.5" fill="white"/>
      <line x1="10" y1="24" x2="60" y2="24" stroke="currentColor" stroke-width="2"/>
      <line x1="10" y1="36" x2="60" y2="36" stroke="currentColor" stroke-width="2"/>
      <line x1="10" y1="48" x2="60" y2="48" stroke="currentColor" stroke-width="2"/>
      <circle cx="18" cy="17" r="2.5" fill="currentColor"/>
      <circle cx="26" cy="17" r="2.5" fill="currentColor"/>
      <circle cx="34" cy="17" r="2.5" fill="currentColor"/>
      <rect x="14" y="28" width="8" height="5" rx="1" stroke="currentColor" stroke-width="1.5" fill="white"/>
      <rect x="28" y="28" width="8" height="5" rx="1" stroke="currentColor" stroke-width="1.5" fill="white"/>
      <rect x="42" y="28" width="8" height="5" rx="1" stroke="currentColor" stroke-width="1.5" fill="white"/>
      <rect x="14" y="40" width="8" height="5" rx="1" stroke="currentColor" stroke-width="1.5" fill="white"/>
      <rect x="28" y="40" width="8" height="5" rx="1" stroke="currentColor" stroke-width="1.5" fill="white"/>
      <rect x="42" y="40" width="8" height="5" rx="1" stroke="currentColor" stroke-width="1.5" fill="white"/>
      <circle cx="35" cy="6" r="4" fill="currentColor" opacity="0.6"/>
      <line x1="35" y1="10" x2="35" y2="12" stroke="currentColor" stroke-width="2"/>
    </svg>`
  },

  // 2. 云脉SASE - 零信任（盾牌+验证）
  cloud: {
    name: '云脉SASE',
    category: 'security',
    productId: 'C02_SASE',
    color: '#C00000',
    width: 70, height: 65,
    svg: `<svg viewBox="0 0 70 65" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M35 4 L8 18 L8 42 Q8 58 35 66 Q62 58 62 42 L62 18 Z" stroke="currentColor" stroke-width="2.5" fill="white"/>
      <path d="M35 14 L18 24 L18 42 Q18 54 35 60 Q52 54 52 42 L52 24 Z" stroke="currentColor" stroke-width="1.5" fill="currentColor" opacity="0.06"/>
      <path d="M26 34 L32 40 L48 24" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="35" cy="38" r="12" stroke="currentColor" stroke-width="1.2" fill="none" stroke-dasharray="3,2"/>
    </svg>`
  },

  // 3. 云镜终端安全 - 盾牌+PC
  shield: {
    name: '云镜终端安全',
    category: 'security',
    productId: 'C03_PC',
    color: '#C00000',
    width: 70, height: 70,
    svg: `<svg viewBox="0 0 70 70" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M35 6 L10 18 L10 42 Q10 58 35 66 Q60 58 60 42 L60 18 Z" stroke="currentColor" stroke-width="2.5" fill="white"/>
      <path d="M35 16 L18 24 L18 42 Q18 54 35 58 Q52 54 52 42 L52 24 Z" stroke="currentColor" stroke-width="1.5" fill="currentColor" opacity="0.06"/>
      <rect x="26" y="30" width="18" height="12" rx="1.5" stroke="currentColor" stroke-width="1.8" fill="white"/>
      <rect x="28" y="32" width="14" height="8" stroke="currentColor" stroke-width="1" fill="white"/>
      <line x1="35" y1="42" x2="35" y2="48" stroke="currentColor" stroke-width="1.8"/>
      <line x1="30" y1="48" x2="40" y2="48" stroke="currentColor" stroke-width="1.8"/>
      <path d="M30 28 L32 31 L40 27" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`
  },

  // 4. 云镜服务器安全 - 服务器+安全
  shieldServer: {
    name: '云镜服务器安全',
    category: 'security',
    productId: 'C03_SERVER',
    color: '#C00000',
    width: 70, height: 70,
    svg: `<svg viewBox="0 0 70 70" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="8" y="12" width="46" height="46" rx="4" stroke="currentColor" stroke-width="2.5" fill="white"/>
      <line x1="8" y1="26" x2="54" y2="26" stroke="currentColor" stroke-width="1.8"/>
      <line x1="8" y1="40" x2="54" y2="40" stroke="currentColor" stroke-width="1.8"/>
      <circle cx="17" cy="19" r="3" fill="currentColor"/>
      <circle cx="17" cy="33" r="3" fill="currentColor" opacity="0.6"/>
      <circle cx="17" cy="47" r="3" fill="currentColor" opacity="0.3"/>
      <rect x="24" y="16" width="20" height="5" rx="1" stroke="currentColor" stroke-width="1.5" fill="white"/>
      <rect x="24" y="30" width="20" height="5" rx="1" stroke="currentColor" stroke-width="1.5" fill="white"/>
      <rect x="24" y="44" width="20" height="5" rx="1" stroke="currentColor" stroke-width="1.5" fill="white"/>
      <path d="M35 6 L35 12 M25 6 L25 12 M45 6 L45 12" stroke="currentColor" stroke-width="2"/>
    </svg>`
  },

  // 5. 网站安全专家 - 盾牌+地球（优化版）
  web: {
    name: '网站安全专家',
    category: 'security',
    productId: 'C05_WEB',
    color: '#C00000',
    width: 70, height: 65,
    svg: `<svg viewBox="0 0 70 65" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="35" cy="28" r="22" stroke="currentColor" stroke-width="2.5" fill="white"/>
      <ellipse cx="35" cy="28" rx="22" ry="9" stroke="currentColor" stroke-width="1.5"/>
      <ellipse cx="35" cy="28" rx="9" ry="22" stroke="currentColor" stroke-width="1.5"/>
      <line x1="13" y1="28" x2="57" y2="28" stroke="currentColor" stroke-width="1" opacity="0.6"/>
      <circle cx="35" cy="28" r="10" stroke="currentColor" stroke-width="1.2" fill="currentColor" opacity="0.06"/>
      <path d="M31 14 L31 22 M39 14 L39 22" stroke="currentColor" stroke-width="1.5" opacity="0.5"/>
      <path d="M26 54 L31 46 L39 46 L44 54 Z" stroke="currentColor" stroke-width="2.2" fill="currentColor" opacity="0.08"/>
      <path d="M31 46 L29 40 L41 40 L39 46" stroke="currentColor" stroke-width="2.2" fill="currentColor" opacity="0.08"/>
      <path d="M33 46 L34 51 L36 51 L37 46" stroke="currentColor" stroke-width="2" fill="currentColor" opacity="0.1"/>
      <path d="M32 17 L34 20 L38 16" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`
  },

  // 6. 等保助手 - 文档+对勾
  compliance: {
    name: '等保助手',
    category: 'security',
    productId: 'C13_COMPLIANCE',
    color: '#C00000',
    width: 70, height: 70,
    svg: `<svg viewBox="0 0 70 70" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="12" y="6" width="46" height="54" rx="3" stroke="currentColor" stroke-width="2.5" fill="white"/>
      <line x1="12" y1="20" x2="58" y2="20" stroke="currentColor" stroke-width="1.8"/>
      <line x1="12" y1="34" x2="58" y2="34" stroke="currentColor" stroke-width="1.8"/>
      <line x1="12" y1="48" x2="40" y2="48" stroke="currentColor" stroke-width="1.5"/>
      <path d="M16 26 L20 30 L28 20" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M16 40 L20 44 L28 34" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M16 54 L20 58 L28 48" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
      <rect x="44" y="44" width="12" height="7" rx="2" stroke="currentColor" stroke-width="1.5" fill="currentColor" opacity="0.1"/>
    </svg>`
  },

  // 7. 云堤抗D - 多层防御三角
  antiD: {
    name: '云堤抗D',
    category: 'security',
    productId: 'C14_ANTI_D',
    color: '#C00000',
    width: 70, height: 65,
    svg: `<svg viewBox="0 0 70 65" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M35 6 L6 34 L24 60 L46 60 L64 34 Z" stroke="currentColor" stroke-width="2.5" fill="white"/>
      <path d="M35 16 L18 34 L30 50 L40 50 L52 34 Z" stroke="currentColor" stroke-width="1.8" fill="currentColor" opacity="0.05"/>
      <path d="M35 26 L26 36 L32 42 L38 42 L44 36 Z" stroke="currentColor" stroke-width="1.5" fill="currentColor" opacity="0.08"/>
      <circle cx="35" cy="38" r="4" stroke="currentColor" stroke-width="2" fill="white"/>
      <path d="M32 38 L34 40 L38 36" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <line x1="35" y1="6" x2="35" y2="16" stroke="currentColor" stroke-width="2"/>
    </svg>`
  },

  // 8. MSSP托管运营 - 目标+监控
  msss: {
    name: 'MSSP托管运营',
    category: 'security',
    productId: 'C04_MSSP',
    color: '#C00000',
    width: 70, height: 65,
    svg: `<svg viewBox="0 0 70 65" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="35" cy="30" r="24" stroke="currentColor" stroke-width="2.5" fill="white"/>
      <circle cx="35" cy="30" r="18" stroke="currentColor" stroke-width="1.5" fill="none" stroke-dasharray="5,3"/>
      <circle cx="35" cy="30" r="9" stroke="currentColor" stroke-width="1.5" fill="currentColor" opacity="0.06"/>
      <circle cx="35" cy="30" r="3" fill="currentColor"/>
      <line x1="35" y1="6" x2="35" y2="16" stroke="currentColor" stroke-width="2"/>
      <line x1="35" y1="44" x2="35" y2="54" stroke="currentColor" stroke-width="2"/>
      <line x1="11" y1="30" x2="21" y2="30" stroke="currentColor" stroke-width="2"/>
      <line x1="49" y1="30" x2="59" y2="30" stroke="currentColor" stroke-width="2"/>
      <circle cx="35" cy="14" r="2.5" fill="currentColor"/>
      <circle cx="35" cy="46" r="2.5" fill="currentColor"/>
      <circle cx="19" cy="30" r="2.5" fill="currentColor"/>
      <circle cx="51" cy="30" r="2.5" fill="currentColor"/>
    </svg>`
  },

  // 9. 云WAF - Web应用防火墙
  cloudWAF: {
    name: '云WAF',
    category: 'security',
    productId: 'C06_WAF',
    color: '#C00000',
    width: 70, height: 65,
    svg: `<svg viewBox="0 0 70 65" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="10" y="8" width="50" height="36" rx="4" stroke="currentColor" stroke-width="2.5" fill="white"/>
      <rect x="10" y="8" width="50" height="12" rx="4" stroke="currentColor" stroke-width="2.5" fill="currentColor" opacity="0.1"/>
      <circle cx="17" cy="14" r="3" fill="#ff4d4f"/>
      <circle cx="26" cy="14" r="3" fill="#faad14"/>
      <circle cx="35" cy="14" r="3" fill="#52c41a"/>
      <line x1="13" y1="24" x2="30" y2="24" stroke="currentColor" stroke-width="2" opacity="0.6"/>
      <line x1="13" y1="30" x2="22" y2="30" stroke="currentColor" stroke-width="2" opacity="0.4"/>
      <line x1="13" y1="36" x2="35" y2="36" stroke="currentColor" stroke-width="2" opacity="0.3"/>
      <path d="M44 48 L44 54 M44 54 L40 58 M44 54 L48 58" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="44" cy="44" r="6" stroke="currentColor" stroke-width="2" fill="white"/>
    </svg>`
  },

  // 10. 云堡垒机 - Bastion Host
  bastion: {
    name: '云堡垒机',
    category: 'security',
    productId: 'C07_BASTION',
    color: '#C00000',
    width: 70, height: 70,
    svg: `<svg viewBox="0 0 70 70" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="12" y="8" width="46" height="52" rx="4" stroke="currentColor" stroke-width="2.5" fill="white"/>
      <rect x="12" y="8" width="46" height="14" rx="4" stroke="currentColor" stroke-width="2.5" fill="currentColor" opacity="0.1"/>
      <rect x="18" y="26" width="14" height="10" rx="2" stroke="currentColor" stroke-width="1.8" fill="white"/>
      <rect x="38" y="26" width="14" height="10" rx="2" stroke="currentColor" stroke-width="1.8" fill="white"/>
      <line x1="25" y1="36" x2="25" y2="50" stroke="currentColor" stroke-width="1.8"/>
      <line x1="45" y1="36" x2="45" y2="50" stroke="currentColor" stroke-width="1.8"/>
      <line x1="18" y1="50" x2="32" y2="50" stroke="currentColor" stroke-width="1.8"/>
      <line x1="38" y1="50" x2="52" y2="50" stroke="currentColor" stroke-width="1.8"/>
      <circle cx="25" cy="15" r="3" fill="currentColor"/>
      <circle cx="35" cy="15" r="3" fill="currentColor"/>
      <circle cx="45" cy="15" r="3" fill="currentColor"/>
    </svg>`
  },

  // 11. 日志审计 - Log Audit
  logAudit: {
    name: '日志审计',
    category: 'security',
    productId: 'C08_LOG',
    color: '#C00000',
    width: 70, height: 65,
    svg: `<svg viewBox="0 0 70 65" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="8" y="10" width="54" height="48" rx="3" stroke="currentColor" stroke-width="2.5" fill="white"/>
      <line x1="8" y1="20" x2="62" y2="20" stroke="currentColor" stroke-width="1.8"/>
      <rect x="12" y="25" width="20" height="4" rx="1" stroke="currentColor" stroke-width="1.2" fill="currentColor" opacity="0.08"/>
      <rect x="36" y="25" width="22" height="4" rx="1" stroke="currentColor" stroke-width="1.2" fill="currentColor" opacity="0.08"/>
      <rect x="12" y="35" width="14" height="4" rx="1" stroke="currentColor" stroke-width="1.2" fill="currentColor" opacity="0.08"/>
      <rect x="30" y="35" width="28" height="4" rx="1" stroke="currentColor" stroke-width="1.2" fill="currentColor" opacity="0.08"/>
      <rect x="12" y="45" width="24" height="4" rx="1" stroke="currentColor" stroke-width="1.2" fill="currentColor" opacity="0.08"/>
      <rect x="40" y="45" width="18" height="4" rx="1" stroke="currentColor" stroke-width="1.2" fill="currentColor" opacity="0.08"/>
      <circle cx="20" cy="15" r="2" fill="currentColor"/>
      <circle cx="28" cy="15" r="2" fill="currentColor"/>
      <circle cx="36" cy="15" r="2" fill="currentColor"/>
    </svg>`
  },

  // 12. 数据库审计 - DB Audit
  dbAudit: {
    name: '数据库审计',
    category: 'security',
    productId: 'C09_DBA',
    color: '#C00000',
    width: 70, height: 65,
    svg: `<svg viewBox="0 0 70 65" fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="35" cy="14" rx="22" ry="7" stroke="currentColor" stroke-width="2.5" fill="white"/>
      <path d="M13 14 L13 48 Q13 56 35 56 Q57 56 57 48 L57 14" stroke="currentColor" stroke-width="2.5" fill="white"/>
      <ellipse cx="35" cy="38" rx="22" ry="7" stroke="currentColor" stroke-width="2" fill="white"/>
      <ellipse cx="35" cy="26" rx="22" ry="7" stroke="currentColor" stroke-width="1.5" fill="white" opacity="0.5"/>
      <path d="M25 22 L29 26 L41 20" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="35" cy="38" r="4" stroke="currentColor" stroke-width="2" fill="white"/>
    </svg>`
  },

  // 13. 漏洞扫描 - Vulnerability Scanner
  vulnScan: {
    name: '漏洞扫描',
    category: 'security',
    productId: 'C10_VULN',
    color: '#C00000',
    width: 70, height: 65,
    svg: `<svg viewBox="0 0 70 65" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 54 L12 10 L58 28 L12 28" stroke="currentColor" stroke-width="2.5" fill="white"/>
      <circle cx="35" cy="28" r="18" stroke="currentColor" stroke-width="2" fill="none" stroke-dasharray="4,3"/>
      <circle cx="35" cy="28" r="10" stroke="currentColor" stroke-width="1.5" fill="currentColor" opacity="0.05"/>
      <circle cx="35" cy="28" r="4" fill="currentColor"/>
      <line x1="35" y1="10" x2="35" y2="18" stroke="currentColor" stroke-width="2"/>
      <line x1="17" y1="28" x2="25" y2="28" stroke="currentColor" stroke-width="2"/>
      <line x1="45" y1="28" x2="53" y2="28" stroke="currentColor" stroke-width="2"/>
      <path d="M22 18 L28 22 M22 38 L28 34" stroke="currentColor" stroke-width="1.5" opacity="0.4"/>
      <path d="M48 18 L42 22 M48 38 L42 34" stroke="currentColor" stroke-width="1.5" opacity="0.4"/>
    </svg>`
  },

  // 14. 态势感知 - Situation Awareness
  siem: {
    name: '态势感知',
    category: 'security',
    productId: 'C11_SIEM',
    color: '#C00000',
    width: 70, height: 65,
    svg: `<svg viewBox="0 0 70 65" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="6" y="8" width="58" height="48" rx="4" stroke="currentColor" stroke-width="2.5" fill="white"/>
      <line x1="6" y1="22" x2="64" y2="22" stroke="currentColor" stroke-width="1.8"/>
      <polyline points="12,48 22,36 30,40 40,26 50,32 58,22" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity="0.7"/>
      <polyline points="12,48 22,44 30,46 40,36 50,40 58,34" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity="0.5" stroke-dasharray="3,2"/>
      <circle cx="40" cy="26" r="3" fill="currentColor"/>
      <circle cx="50" cy="32" r="3" fill="currentColor" opacity="0.7"/>
      <circle cx="30" cy="40" r="3" fill="currentColor" opacity="0.5"/>
      <circle cx="22" cy="36" r="3" fill="currentColor" opacity="0.3"/>
      <rect x="24" y="14" width="16" height="4" rx="1" fill="currentColor" opacity="0.2"/>
    </svg>`
  },

  // ==================== 特殊组件 ====================

  // 防火墙
  firewall: {
    name: '防火墙',
    category: 'network',
    color: '#C00000',
    width: 70,
    height: 55,
    svg: `<svg viewBox="0 0 70 55" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="10" y="10" width="50" height="35" rx="4" stroke="currentColor" stroke-width="2" fill="white"/>
      <line x1="10" y1="22" x2="60" y2="22" stroke="currentColor" stroke-width="2"/>
      <line x1="10" y1="33" x2="60" y2="33" stroke="currentColor" stroke-width="2"/>
      <circle cx="18" cy="16" r="2" fill="currentColor"/>
      <circle cx="26" cy="16" r="2" fill="currentColor"/>
      <rect x="16" y="26" width="8" height="4" rx="1" stroke="currentColor" stroke-width="1.5" fill="white"/>
      <rect x="31" y="26" width="8" height="4" rx="1" stroke="currentColor" stroke-width="1.5" fill="white"/>
      <rect x="46" y="26" width="8" height="4" rx="1" stroke="currentColor" stroke-width="1.5" fill="white"/>
    </svg>`
  },

  // 互联网（优化版 - 清晰的地球网络图标）
  internet: {
    name: '互联网',
    category: 'special',
    color: '#666666',
    width: 70,
    height: 65,
    svg: `<svg viewBox="0 0 70 65" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="35" cy="30" r="22" stroke="currentColor" stroke-width="2.5" fill="white"/>
      <ellipse cx="35" cy="30" rx="22" ry="10" stroke="currentColor" stroke-width="1.5"/>
      <line x1="35" y1="8" x2="35" y2="52" stroke="currentColor" stroke-width="1.2"/>
      <ellipse cx="35" cy="30" rx="10" ry="22" stroke="currentColor" stroke-width="1.5"/>
      <line x1="13" y1="30" x2="57" y2="30" stroke="currentColor" stroke-width="1.2"/>
      <path d="M16 18 Q25 8 38 17" stroke="currentColor" stroke-width="1.2" fill="none" opacity="0.5"/>
      <path d="M16 42 Q25 52 38 43" stroke="currentColor" stroke-width="1.2" fill="none" opacity="0.5"/>
      <path d="M32 8 Q42 18 54 18" stroke="currentColor" stroke-width="1.2" fill="none" opacity="0.5"/>
      <path d="M32 52 Q42 42 54 42" stroke="currentColor" stroke-width="1.2" fill="none" opacity="0.5"/>
      <circle cx="35" cy="30" r="5" fill="currentColor" opacity="0.15"/>
      <circle cx="35" cy="30" r="2.5" fill="currentColor"/>
      <line x1="35" y1="4" x2="35" y2="8" stroke="currentColor" stroke-width="2"/>
      <line x1="35" y1="52" x2="35" y2="56" stroke="currentColor" stroke-width="2"/>
      <line x1="13" y1="30" x2="7" y2="30" stroke="currentColor" stroke-width="2"/>
      <line x1="57" y1="30" x2="63" y2="30" stroke="currentColor" stroke-width="2"/>
    </svg>`
  },

  // 数据库
  database: {
    name: '数据库',
    category: 'network',
    color: '#666666',
    width: 65,
    height: 65,
    svg: `<svg viewBox="0 0 65 65" fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="32" cy="15" rx="22" ry="7" stroke="currentColor" stroke-width="2" fill="white"/>
      <path d="M10 15 L10 48 Q10 58 32 58 Q54 58 54 48 L54 15" stroke="currentColor" stroke-width="2" fill="white"/>
      <ellipse cx="32" cy="40" rx="22" ry="7" stroke="currentColor" stroke-width="2" fill="white"/>
      <ellipse cx="32" cy="28" rx="22" ry="7" stroke="currentColor" stroke-width="1.5" stroke-dasharray="3,2" fill="white" opacity="0.5"/>
    </svg>`
  },

  // ==================== 区域组件 - 4个不同颜色 ====================
  serverZone: {
    name: '服务器区域', category: 'zone', color: '#C00000',
    width: 70, height: 50,
    svg: `<svg viewBox="0 0 70 50" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="2" width="66" height="46" rx="6" stroke="currentColor" stroke-width="2" stroke-dasharray="6,3" fill="#e6f7ff"/>
      <text x="35" y="29" text-anchor="middle" font-size="10" fill="#C00000" font-weight="600">服务器区域</text>
    </svg>`
  },
  dmzZone: {
    name: 'DMZ区域', category: 'zone', color: '#C00000',
    width: 70, height: 50,
    svg: `<svg viewBox="0 0 70 50" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="2" width="66" height="46" rx="6" stroke="currentColor" stroke-width="2" stroke-dasharray="6,3" fill="#fff3e0"/>
      <text x="35" y="29" text-anchor="middle" font-size="10" fill="#C00000" font-weight="600">DMZ区域</text>
    </svg>`
  },
  officeZone: {
    name: '办公区域', category: 'zone', color: '#C00000',
    width: 70, height: 50,
    svg: `<svg viewBox="0 0 70 50" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="2" width="66" height="46" rx="6" stroke="currentColor" stroke-width="2" stroke-dasharray="6,3" fill="#f0fff0"/>
      <text x="35" y="29" text-anchor="middle" font-size="10" fill="#C00000" font-weight="600">办公区域</text>
    </svg>`
  },
  internetZone: {
    name: '互联网区域', category: 'zone', color: '#C00000',
    width: 70, height: 50,
    svg: `<svg viewBox="0 0 70 50" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="2" width="66" height="46" rx="6" stroke="currentColor" stroke-width="2" stroke-dasharray="6,3" fill="#e8f4fd"/>
      <text x="35" y="29" text-anchor="middle" font-size="10" fill="#C00000" font-weight="600">互联网区域</text>
    </svg>`
  }
};

// 连接线类型定义
const ConnectionTypes = {
  internet: {
    name: '互联网线路',
    color: '#666666',
    style: 'solid',
    width: 3
  },
  专线: {
    name: '专线/MSTP',
    color: '#1890FF',
    style: 'solid',
    width: 3
  },
  vpn: {
    name: 'VPN隧道',
    color: '#52C41A',
    style: 'dashed',
    width: 2
  },
  数据流: {
    name: '数据流向',
    color: '#FA8C16',
    style: 'arrow',
    width: 2
  }
};

// 导出图标数据
window.TopologyIcons = TopologyIcons;
window.ConnectionTypes = ConnectionTypes;
