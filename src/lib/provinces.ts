export const PROVINCES = [
  { id: "anhui", name: "安徽" },
  { id: "beijing", name: "北京" },
  { id: "chongqing", name: "重庆" },
  { id: "fujian", name: "福建" },
  { id: "gansu", name: "甘肃" },
  { id: "guangdong", name: "广东" },
  { id: "guangxi-zhuang", name: "广西" },
  { id: "guizhou", name: "贵州" },
  { id: "hainan", name: "海南" },
  { id: "hebei", name: "河北" },
  { id: "heilongjiang", name: "黑龙江" },
  { id: "henan", name: "河南" },
  { id: "hong-kong", name: "香港" },
  { id: "hubei", name: "湖北" },
  { id: "hunan", name: "湖南" },
  { id: "jiangsu", name: "江苏" },
  { id: "jiangxi", name: "江西" },
  { id: "jilin", name: "吉林" },
  { id: "liaoning", name: "辽宁" },
  { id: "macau", name: "澳门" },
  { id: "nei-mongol", name: "内蒙古" },
  { id: "ningxia-hui", name: "宁夏" },
  { id: "quinghai", name: "青海" },
  { id: "shaanxi", name: "陕西" },
  { id: "shandong", name: "山东" },
  { id: "shanghai", name: "上海" },
  { id: "shanxi", name: "山西" },
  { id: "sichuan", name: "四川" },
  { id: "tianjin", name: "天津" },
  { id: "xinjiang-uygur", name: "新疆" },
  { id: "xizang-tibet", name: "西藏" },
  { id: "yunnan", name: "云南" },
  { id: "zhejiang", name: "浙江" },
] as const;

export type ProvinceId = (typeof PROVINCES)[number]["id"];

const PROVINCE_NAME_MAP = new Map<ProvinceId, string>(
  PROVINCES.map((province) => [province.id, province.name]),
);

const PROVINCE_ALIAS_MAP: Record<string, ProvinceId> = {
  安徽: "anhui",
  北京: "beijing",
  重庆: "chongqing",
  福建: "fujian",
  甘肃: "gansu",
  广东: "guangdong",
  广西: "guangxi-zhuang",
  广西壮族自治区: "guangxi-zhuang",
  贵州: "guizhou",
  海南: "hainan",
  河北: "hebei",
  黑龙江: "heilongjiang",
  河南: "henan",
  香港: "hong-kong",
  湖北: "hubei",
  湖南: "hunan",
  江苏: "jiangsu",
  江西: "jiangxi",
  吉林: "jilin",
  辽宁: "liaoning",
  澳门: "macau",
  内蒙古: "nei-mongol",
  内蒙古自治区: "nei-mongol",
  宁夏: "ningxia-hui",
  宁夏回族自治区: "ningxia-hui",
  青海: "quinghai",
  陕西: "shaanxi",
  山东: "shandong",
  上海: "shanghai",
  山西: "shanxi",
  四川: "sichuan",
  天津: "tianjin",
  新疆: "xinjiang-uygur",
  新疆维吾尔自治区: "xinjiang-uygur",
  西藏: "xizang-tibet",
  西藏自治区: "xizang-tibet",
  云南: "yunnan",
  浙江: "zhejiang",
  武汉: "hubei",
  广州: "guangdong",
};

export function isProvinceId(value: string): value is ProvinceId {
  return PROVINCES.some((province) => province.id === value);
}

export function inferProvinceId(...inputs: Array<string | undefined | null>) {
  for (const rawInput of inputs) {
    const input = String(rawInput ?? "").trim();
    if (!input) continue;

    if (isProvinceId(input)) {
      return input;
    }

    for (const [keyword, provinceId] of Object.entries(PROVINCE_ALIAS_MAP)) {
      if (input.includes(keyword)) {
        return provinceId;
      }
    }
  }

  return undefined;
}

export function getProvinceName(provinceId?: ProvinceId) {
  return provinceId ? PROVINCE_NAME_MAP.get(provinceId) ?? "未设置省份" : "未设置省份";
}
