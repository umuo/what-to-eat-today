export const DEFAULT_GUEST_ITEMS = [
  { id: 'guest-1', name: '火锅', iconKey: 'hotpot', weight: 1 },
  { id: 'guest-2', name: '烧烤', iconKey: 'bbq', weight: 1 },
  { id: 'guest-3', name: '日料', iconKey: 'japanese', weight: 1 },
  { id: 'guest-4', name: '面食', iconKey: 'noodles', weight: 1 },
  { id: 'guest-5', name: '快餐', iconKey: 'fastfood', weight: 1 },
  { id: 'guest-6', name: '家常菜', iconKey: 'homestyle', weight: 1 },
  { id: 'guest-7', name: '轻食', iconKey: 'lightmeal', weight: 1 },
  { id: 'guest-8', name: '川菜', iconKey: 'sichuan', weight: 1 },
];

/**
 * 24-icon food catalog:
 * - First 12 use custom transparent soft-3D illustrations in /assets/illustrations/*.webp
 * - Remaining 12 use layered gradient vector SVGs in FoodIcon.jsx
 */
export const FOOD_ICON_CATALOG = [
  { key: 'hotpot', label: '火锅', type: 'image', src: '/assets/illustrations/hotpot.webp' },
  { key: 'bbq', label: '烧烤', type: 'image', src: '/assets/illustrations/bbq.webp' },
  { key: 'japanese', label: '日料', type: 'image', src: '/assets/illustrations/japanese.webp' },
  { key: 'noodles', label: '面食', type: 'image', src: '/assets/illustrations/noodles.webp' },
  { key: 'fastfood', label: '快餐炸鸡', type: 'image', src: '/assets/illustrations/fastfood.webp' },
  { key: 'homestyle', label: '家常菜', type: 'image', src: '/assets/illustrations/homestyle.webp' },
  { key: 'lightmeal', label: '轻食汉堡', type: 'image', src: '/assets/illustrations/lightmeal.webp' },
  { key: 'sichuan', label: '川湘菜', type: 'image', src: '/assets/illustrations/sichuan.webp' },
  { key: 'milktea', label: '奶茶饮品', type: 'image', src: '/assets/illustrations/milktea.webp' },
  { key: 'pizza', label: '披萨意面', type: 'image', src: '/assets/illustrations/pizza.webp' },
  { key: 'dessert', label: '蛋糕甜品', type: 'image', src: '/assets/illustrations/dessert.webp' },
  { key: 'dumplings', label: '饺子点心', type: 'image', src: '/assets/illustrations/dumplings.webp' },
  // 12 Vector SVG icons
  { key: 'rice', label: '盖饭便当', type: 'svg' },
  { key: 'seafood', label: '海鲜龙虾', type: 'svg' },
  { key: 'steak', label: '牛排西餐', type: 'svg' },
  { key: 'salad', label: '蔬果沙拉', type: 'svg' },
  { key: 'friedchicken', label: '炸鸡汉堡', type: 'svg' },
  { key: 'cantonese', label: '粤菜早茶', type: 'svg' },
  { key: 'malatang', label: '麻辣烫', type: 'svg' },
  { key: 'pho', label: '米粉米线', type: 'svg' },
  { key: 'fruit', label: '鲜切水果', type: 'svg' },
  { key: 'coffee', label: '精品咖啡', type: 'svg' },
  { key: 'bakery', label: '烘焙面包', type: 'svg' },
  { key: 'shop', label: '宝藏店铺', type: 'svg' },
];

export const FOOD_ICON_MAP = Object.fromEntries(FOOD_ICON_CATALOG.map((item) => [item.key, item]));

const KEYWORD_RULES = [
  {
    key: 'hotpot',
    words: ['火锅', '海底捞', '呷哺', '潮汕牛肉', '涮肉', '椰子鸡', '寿喜烧', '串串香', '羊蝎子', '铜锅', '冬阴功', '锅'],
  },
  {
    key: 'bbq',
    words: ['烧烤', '烤肉', '烤串', '撸串', '木屋', '大排档', '烤鸡翅', '铁板烧', '烤羊腿', '韩式烤肉', '烤'],
  },
  {
    key: 'japanese',
    words: ['日料', '寿司', '刺身', '三文鱼', '居酒屋', '鳗鱼', '天妇罗', '丼', '吉野家', '滨寿司', '元气'],
  },
  {
    key: 'pho',
    words: ['螺蛳粉', '米粉', '米线', '过桥', '酸辣粉', '河粉', '肠粉', '桂林', '云南', '花甲粉'],
  },
  {
    key: 'noodles',
    words: ['面', '拉面', '拌面', '炸酱面', '牛肉面', '乌冬', '板面', '刀削面', '重庆小面', '热干面', '和府', '味千'],
  },
  {
    key: 'malatang',
    words: ['麻辣烫', '麻辣拌', '冒菜', '杨国福', '张亮', '关东煮', '钵钵鸡'],
  },
  {
    key: 'fastfood',
    words: ['麦当劳', '肯德基', 'kfc', '汉堡王', '德克士', '华莱士', '塔斯汀', '炸鸡', '快餐', '鸡腿', '鸡排', '正新'],
  },
  {
    key: 'lightmeal',
    words: ['轻食', '三明治', '赛百味', 'wagas', '沃歌斯', '贝果', '潜艇堡', '汉堡', 'shake'],
  },
  {
    key: 'salad',
    words: ['沙拉', '减脂', '健身餐', '牛油果', '波奇饭', 'poke', '素食'],
  },
  {
    key: 'sichuan',
    words: ['川菜', '湘菜', '水煮鱼', '毛血旺', '酸菜鱼', '太二', '烤鱼', '辣子鸡', '干锅', '麻婆', '回锅肉', '费大厨'],
  },
  {
    key: 'milktea',
    words: ['喜茶', '奈雪', '霸王茶姬', '茶百道', '蜜雪', '一点点', '古茗', '沪上阿姨', 'coco', '奶茶', '果茶', '柠檬茶', '茶颜'],
  },
  {
    key: 'coffee',
    words: ['瑞幸', '星巴克', 'manner', '库迪', 'luckin', '咖啡', '拿铁', '美式', 'espresso', 'cafe'],
  },
  {
    key: 'pizza',
    words: ['必胜客', '达美乐', '萨莉亚', '披萨', '意面', '意大利面', '芝士', '焗饭'],
  },
  {
    key: 'steak',
    words: ['牛排', '西餐', '西堤', '王品', '鹅肝', '意餐', '法餐'],
  },
  {
    key: 'seafood',
    words: ['海鲜', '小龙虾', '大闸蟹', '螃蟹', '生蚝', '扇贝', '蛤蜊', '虾', '蟹'],
  },
  {
    key: 'dessert',
    words: ['蛋糕', '甜品', '冰激凌', '冰淇淋', 'dq', '哈根达斯', '糖水', '芋圆', '豆花', '布丁', '双皮奶', '奶茶蛋糕'],
  },
  {
    key: 'bakery',
    words: ['面包', '烘焙', '可颂', '好利来', '鲍师傅', '吐司', '蛋挞', '甜甜圈', '蛋糕店'],
  },
  {
    key: 'dumplings',
    words: ['饺子', '水饺', '馄饨', '抄手', '云吞', '包子', '小笼包', '生煎', '锅贴', '蒸饺', '点心'],
  },
  {
    key: 'cantonese',
    words: ['粤菜', '早茶', '茶餐厅', '点都德', '蔡澜', '烧腊', '叉烧', '白切鸡', '虾饺', '煲汤'],
  },
  {
    key: 'rice',
    words: ['沙县', '黄焖鸡', '猪脚饭', '盖饭', '盖浇饭', '煲仔饭', '便当', '木桶饭', '老乡鸡', '大米先生', '米饭', '炒饭', '卤肉饭'],
  },
  {
    key: 'homestyle',
    words: ['家常', '炒菜', '东北菜', '小炒', '铁锅炖', '地三鲜', '食堂', '盒饭', '菜馆'],
  },
  {
    key: 'fruit',
    words: ['水果', '水果捞', '百果园', '鲜果', '榴莲', '草莓', '西瓜'],
  },
];

export function matchFoodIconKey(rawName) {
  const name = (rawName || '').trim().toLowerCase();
  if (!name) return 'shop';
  for (const rule of KEYWORD_RULES) {
    if (rule.words.some((w) => name.includes(w.toLowerCase()))) {
      return rule.key;
    }
  }
  return 'shop';
}

/**
 * Reference mockup 8-slice pastel macaron palette (clockwise starting at 12 o'clock):
 * Slot 0 (火锅, left of 12 o'clock) uses #FDE4B8 (index 7 in clockwise from 0°? Let's define exact slice palette):
 * Look at mockup:
 * - 火锅 (top-left of 12 o'clock): warm apricot #FDE4B8
 * - 烧烤 (top-right of 12 o'clock): peach coral #FCD5CE
 * - 日料 (upper-right): soft lilac pink #F3D5F5
 * - 面食 (lower-right): butter yellow #FEF1C5
 * - 快餐 (bottom-right): blush rose #FDD5D8
 * - 家常菜 (bottom-left): mint green #DCF2D6
 * - 轻食 (lower-left): sky blue #CBEAFB
 * - 川菜 (upper-left): soft lime cream #E6F4C8 (or #D8DCFF)
 */
export const WHEEL_PALETTE = [
  '#FDE4B8', // 火锅 - 暖杏色
  '#FCD5CE', // 烧烤 - 蜜桃粉
  '#F3D5F5', // 日料 - 樱花紫
  '#FEF1C5', // 面食 - 奶油黄
  '#FDD5D8', // 快餐 - 草莓粉
  '#D8DCFF', // 家常菜 - 浅紫蓝
  '#CBEAFB', // 轻食 - 天空蓝
  '#DCF2D6', // 川菜 - 薄荷绿
  '#E5F3C8', // 扩展 - 抹茶青
  '#FCE3EC', // 扩展 - 樱桃粉
];

export function getSliceColors(count) {
  if (count <= 0) return [];
  const colors = [];
  for (let i = 0; i < count; i++) {
    let color = WHEEL_PALETTE[i % WHEEL_PALETTE.length];
    if (i === count - 1 && count > 1 && color === colors[0]) {
      color = WHEEL_PALETTE[(i + 1) % WHEEL_PALETTE.length];
    }
    colors.push(color);
  }
  return colors;
}

export const WIN_QUOTES = [
  '别纠结啦，命运的齿轮已经选好这一口！',
  '今天就宠幸它吧，干饭人冲呀～',
  '胃已经发出强烈赞同信号，立刻出发！',
  '全宇宙美食随机筛选完成，就是它最香！',
  '不用再刷外卖软件十分钟了，直接拿下！',
  '快乐卡路里今日额度已锁定，吃好喝好～',
  '仪式感拉满！这一顿绝对不会踩雷～',
  '听从内心的咕噜声，就是这一家！',
];

export function pickRandomQuote() {
  return WIN_QUOTES[Math.floor(Math.random() * WIN_QUOTES.length)];
}
