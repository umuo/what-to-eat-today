export const DRAW_MODES = [
  {
    id: 'wheel',
    label: '大转盘',
    subtitle: '转一转，决定今天吃什么！',
  },
  {
    id: 'slot',
    label: '老虎机',
    subtitle: '拉动摇杆，三连锁定今日美食！',
  },
  {
    id: 'dice',
    label: '随机抽取',
    subtitle: '掷出幸运双骰，聚光灯为你揭晓！',
  },
  {
    id: 'gashapon',
    label: '扭蛋机',
    subtitle: '拧动紫色扭蛋机，拆开今日美味惊喜！',
  },
];

export const MODE_MAP = Object.fromEntries(DRAW_MODES.map((m) => [m.id, m]));
