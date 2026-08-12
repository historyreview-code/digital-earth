/**
 * 大学主题 - 主要城市数据 (overlay)
 * 覆盖 THE 100 大学的 17 个国家, 加上全球性大城市
 */

import type { MajorCity } from "./types";

export const majorCities: MajorCity[] = [
  // 中国
  { id: "beijing", lat: 39.9042, lng: 116.4074, country: "CN", nameEn: "Beijing", nameZh: "北京", type: "capital", population: "21M" },
  { id: "shanghai", lat: 31.2304, lng: 121.4737, country: "CN", nameEn: "Shanghai", nameZh: "上海", type: "megacity", population: "24M" },
  { id: "hongkong", lat: 22.3193, lng: 114.1694, country: "CN", nameEn: "Hong Kong", nameZh: "中国香港", type: "megacity", population: "7.4M" },
  { id: "hefei", lat: 31.82, lng: 117.25, country: "CN", nameEn: "Hefei", nameZh: "合肥", type: "tech-hub", population: "9.4M" },

  // 美国
  { id: "washington", lat: 38.9072, lng: -77.0369, country: "US", nameEn: "Washington DC", nameZh: "华盛顿", type: "capital", population: "6.3M" },
  { id: "newyork", lat: 40.7128, lng: -74.006, country: "US", nameEn: "New York", nameZh: "纽约", type: "megacity", population: "18.8M" },
  { id: "losangeles", lat: 34.0522, lng: -118.2437, country: "US", nameEn: "Los Angeles", nameZh: "洛杉矶", type: "megacity", population: "12.4M" },
  { id: "sanfrancisco", lat: 37.7749, lng: -122.4194, country: "US", nameEn: "San Francisco", nameZh: "旧金山", type: "tech-hub", population: "4.6M" },
  { id: "boston", lat: 42.3601, lng: -71.0589, country: "US", nameEn: "Boston", nameZh: "波士顿", type: "tech-hub", population: "4.3M" },
  { id: "chicago", lat: 41.8781, lng: -87.6298, country: "US", nameEn: "Chicago", nameZh: "芝加哥", type: "megacity", population: "8.9M" },

  // 英国
  { id: "london", lat: 51.5074, lng: -0.1278, country: "GB", nameEn: "London", nameZh: "伦敦", type: "capital", population: "9M" },
  { id: "edinburgh", lat: 55.9533, lng: -3.1883, country: "GB", nameEn: "Edinburgh", nameZh: "爱丁堡", type: "capital", population: "0.5M" },

  // 加拿大
  { id: "ottawa", lat: 45.4215, lng: -75.6972, country: "CA", nameEn: "Ottawa", nameZh: "渥太华", type: "capital", population: "1M" },
  { id: "toronto", lat: 43.6532, lng: -79.3832, country: "CA", nameEn: "Toronto", nameZh: "多伦多", type: "megacity", population: "6.4M" },
  { id: "vancouver", lat: 49.2827, lng: -123.1207, country: "CA", nameEn: "Vancouver", nameZh: "温哥华", type: "tech-hub", population: "2.6M" },

  // 澳大利亚
  { id: "canberra", lat: -35.2809, lng: 149.13, country: "AU", nameEn: "Canberra", nameZh: "堪培拉", type: "capital", population: "0.4M" },
  { id: "sydney", lat: -33.8688, lng: 151.2093, country: "AU", nameEn: "Sydney", nameZh: "悉尼", type: "megacity", population: "5.3M" },
  { id: "melbourne", lat: -37.8136, lng: 144.9631, country: "AU", nameEn: "Melbourne", nameZh: "墨尔本", type: "megacity", population: "5.1M" },

  // 欧洲
  { id: "berlin", lat: 52.52, lng: 13.405, country: "DE", nameEn: "Berlin", nameZh: "柏林", type: "capital", population: "3.7M" },
  { id: "munich", lat: 48.1351, lng: 11.582, country: "DE", nameEn: "Munich", nameZh: "慕尼黑", type: "tech-hub", population: "1.5M" },
  { id: "paris", lat: 48.8566, lng: 2.3522, country: "FR", nameEn: "Paris", nameZh: "巴黎", type: "capital", population: "11M" },
  { id: "amsterdam", lat: 52.3676, lng: 4.9041, country: "NL", nameEn: "Amsterdam", nameZh: "阿姆斯特丹", type: "capital", population: "0.9M" },
  { id: "brussels", lat: 50.8503, lng: 4.3517, country: "BE", nameEn: "Brussels", nameZh: "布鲁塞尔", type: "capital", population: "1.2M" },
  { id: "bern", lat: 46.948, lng: 7.4474, country: "CH", nameEn: "Bern", nameZh: "伯尔尼", type: "capital", population: "0.13M" },
  { id: "zurich", lat: 47.3769, lng: 8.5417, country: "CH", nameEn: "Zurich", nameZh: "苏黎世", type: "tech-hub", population: "0.4M" },
  { id: "vienna", lat: 48.2082, lng: 16.3738, country: "AT", nameEn: "Vienna", nameZh: "维也纳", type: "capital", population: "2M" },
  { id: "stockholm", lat: 59.3293, lng: 18.0686, country: "SE", nameEn: "Stockholm", nameZh: "斯德哥尔摩", type: "capital", population: "1M" },
  { id: "copenhagen", lat: 55.6761, lng: 12.5683, country: "DK", nameEn: "Copenhagen", nameZh: "哥本哈根", type: "capital", population: "1.4M" },

  // 亚洲
  { id: "tokyo", lat: 35.6762, lng: 139.6503, country: "JP", nameEn: "Tokyo", nameZh: "东京", type: "capital", population: "37M" },
  { id: "kyoto", lat: 35.0116, lng: 135.7681, country: "JP", nameEn: "Kyoto", nameZh: "京都", type: "megacity", population: "1.5M" },
  { id: "seoul", lat: 37.5665, lng: 126.978, country: "KR", nameEn: "Seoul", nameZh: "首尔", type: "capital", population: "9.7M" },
  { id: "singapore", lat: 1.3521, lng: 103.8198, country: "SG", nameEn: "Singapore", nameZh: "新加坡", type: "capital", population: "5.5M" },
];