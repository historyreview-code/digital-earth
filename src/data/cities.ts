/**
 * 主要城市标识 - 用于在地球上叠加地标参考点
 * 与大学点位视觉上区分(灰色环 + 城市名标签)
 * 涵盖 THE 100 所大学所在 17 个国家 + 几个全球性大城市
 */

export interface MajorCity {
  /** ISO 国家代码(用于国旗 emoji) */
  country: string;
  /** 英文城市名 */
  nameEn: string;
  /** 中文城市名 */
  nameZh: string;
  /** 纬度 */
  lat: number;
  /** 经度 */
  lng: number;
  /** 城市类型, 影响视觉 */
  type: "capital" | "megacity" | "tech-hub";
  /** 人口数量级标签 */
  population: string;
}

export const majorCities: MajorCity[] = [
  // 中国
  { country: "CN", nameEn: "Beijing", nameZh: "北京", lat: 39.9042, lng: 116.4074, type: "capital", population: "21M" },
  { country: "CN", nameEn: "Shanghai", nameZh: "上海", lat: 31.2304, lng: 121.4737, type: "megacity", population: "24M" },
  { country: "CN", nameEn: "Hong Kong", nameZh: "中国香港", lat: 22.3193, lng: 114.1694, type: "megacity", population: "7.4M" },
  { country: "CN", nameEn: "Hefei", nameZh: "合肥", lat: 31.8200, lng: 117.2500, type: "tech-hub", population: "9.4M" },

  // 美国
  { country: "US", nameEn: "Washington DC", nameZh: "华盛顿", lat: 38.9072, lng: -77.0369, type: "capital", population: "6.3M" },
  { country: "US", nameEn: "New York", nameZh: "纽约", lat: 40.7128, lng: -74.0060, type: "megacity", population: "18.8M" },
  { country: "US", nameEn: "Los Angeles", nameZh: "洛杉矶", lat: 34.0522, lng: -118.2437, type: "megacity", population: "12.4M" },
  { country: "US", nameEn: "San Francisco", nameZh: "旧金山", lat: 37.7749, lng: -122.4194, type: "tech-hub", population: "4.6M" },
  { country: "US", nameEn: "Boston", nameZh: "波士顿", lat: 42.3601, lng: -71.0589, type: "tech-hub", population: "4.3M" },
  { country: "US", nameEn: "Chicago", nameZh: "芝加哥", lat: 41.8781, lng: -87.6298, type: "megacity", population: "8.9M" },

  // 英国
  { country: "GB", nameEn: "London", nameZh: "伦敦", lat: 51.5074, lng: -0.1278, type: "capital", population: "9M" },
  { country: "GB", nameEn: "Edinburgh", nameZh: "爱丁堡", lat: 55.9533, lng: -3.1883, type: "capital", population: "0.5M" },

  // 加拿大
  { country: "CA", nameEn: "Ottawa", nameZh: "渥太华", lat: 45.4215, lng: -75.6972, type: "capital", population: "1M" },
  { country: "CA", nameEn: "Toronto", nameZh: "多伦多", lat: 43.6532, lng: -79.3832, type: "megacity", population: "6.4M" },
  { country: "CA", nameEn: "Vancouver", nameZh: "温哥华", lat: 49.2827, lng: -123.1207, type: "tech-hub", population: "2.6M" },

  // 澳大利亚
  { country: "AU", nameEn: "Canberra", nameZh: "堪培拉", lat: -35.2809, lng: 149.1300, type: "capital", population: "0.4M" },
  { country: "AU", nameEn: "Sydney", nameZh: "悉尼", lat: -33.8688, lng: 151.2093, type: "megacity", population: "5.3M" },
  { country: "AU", nameEn: "Melbourne", nameZh: "墨尔本", lat: -37.8136, lng: 144.9631, type: "megacity", population: "5.1M" },

  // 欧洲
  { country: "DE", nameEn: "Berlin", nameZh: "柏林", lat: 52.5200, lng: 13.4050, type: "capital", population: "3.7M" },
  { country: "DE", nameEn: "Munich", nameZh: "慕尼黑", lat: 48.1351, lng: 11.5820, type: "tech-hub", population: "1.5M" },
  { country: "FR", nameEn: "Paris", nameZh: "巴黎", lat: 48.8566, lng: 2.3522, type: "capital", population: "11M" },
  { country: "NL", nameEn: "Amsterdam", nameZh: "阿姆斯特丹", lat: 52.3676, lng: 4.9041, type: "capital", population: "0.9M" },
  { country: "BE", nameEn: "Brussels", nameZh: "布鲁塞尔", lat: 50.8503, lng: 4.3517, type: "capital", population: "1.2M" },
  { country: "CH", nameEn: "Bern", nameZh: "伯尔尼", lat: 46.9480, lng: 7.4474, type: "capital", population: "0.13M" },
  { country: "CH", nameEn: "Zurich", nameZh: "苏黎世", lat: 47.3769, lng: 8.5417, type: "tech-hub", population: "0.4M" },
  { country: "AT", nameEn: "Vienna", nameZh: "维也纳", lat: 48.2082, lng: 16.3738, type: "capital", population: "2M" },
  { country: "SE", nameEn: "Stockholm", nameZh: "斯德哥尔摩", lat: 59.3293, lng: 18.0686, type: "capital", population: "1M" },
  { country: "DK", nameEn: "Copenhagen", nameZh: "哥本哈根", lat: 55.6761, lng: 12.5683, type: "capital", population: "1.4M" },

  // 亚洲
  { country: "JP", nameEn: "Tokyo", nameZh: "东京", lat: 35.6762, lng: 139.6503, type: "capital", population: "37M" },
  { country: "JP", nameEn: "Kyoto", nameZh: "京都", lat: 35.0116, lng: 135.7681, type: "megacity", population: "1.5M" },
  { country: "KR", nameEn: "Seoul", nameZh: "首尔", lat: 37.5665, lng: 126.9780, type: "capital", population: "9.7M" },
  { country: "SG", nameEn: "Singapore", nameZh: "新加坡", lat: 1.3521, lng: 103.8198, type: "capital", population: "5.5M" },
];

/**
 * 城市类型颜色
 * - capital: 国旗色调蓝 (#60a5fa) - 首都
 * - megacity: 紫色 (#c084fc) - 大城市
 * - tech-hub: 青色 (#34d399) - 科技中心
 */
export const cityTypeColor = (type: MajorCity["type"]): string => {
  switch (type) {
    case "capital":
      return "#60a5fa";
    case "megacity":
      return "#c084fc";
    case "tech-hub":
      return "#34d399";
  }
};