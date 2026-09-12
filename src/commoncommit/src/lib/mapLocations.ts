import type { Dict } from "../i18n/en.js";

type TKey = keyof Dict;

const CITY_KEYS: Record<string, TKey> = {
  Berlin: "map.location.city.berlin",
  Paris: "map.location.city.paris",
  "São Paulo": "map.location.city.saoPaulo",
  Taipei: "map.location.city.taipei",
  Tokyo: "map.location.city.tokyo",
  Toronto: "map.location.city.toronto",
  Nairobi: "map.location.city.nairobi",
  "Buenos Aires": "map.location.city.buenosAires",
  London: "map.location.city.london",
  Seoul: "map.location.city.seoul",
  Dubai: "map.location.city.dubai",
  Sydney: "map.location.city.sydney",
  Bengaluru: "map.location.city.bengaluru",
  "Mexico City": "map.location.city.mexicoCity",
  "San Francisco": "map.location.city.sanFrancisco",
  Singapore: "map.location.city.singapore",
  Amsterdam: "map.location.city.amsterdam",
  Lagos: "map.location.city.lagos",
  Stockholm: "map.location.city.stockholm",
  "Cape Town": "map.location.city.capeTown",
};

const COUNTRY_KEYS: Record<string, TKey> = {
  Brazil: "map.location.country.brazil",
  Canada: "map.location.country.canada",
  France: "map.location.country.france",
  Germany: "map.location.country.germany",
  Japan: "map.location.country.japan",
  Taiwan: "map.location.country.taiwan",
  Kenya: "map.location.country.kenya",
  Argentina: "map.location.country.argentina",
  "United Kingdom": "map.location.country.unitedKingdom",
  "South Korea": "map.location.country.southKorea",
  "United Arab Emirates": "map.location.country.unitedArabEmirates",
  Australia: "map.location.country.australia",
  India: "map.location.country.india",
  Mexico: "map.location.country.mexico",
  "United States": "map.location.country.unitedStates",
  Singapore: "map.location.country.singapore",
  Netherlands: "map.location.country.netherlands",
  Nigeria: "map.location.country.nigeria",
  Sweden: "map.location.country.sweden",
  "South Africa": "map.location.country.southAfrica",
};

/** Localise the seeded demo locations while preserving future unknown names. */
export function mapLocation(city: string, country: string, translate: (key: TKey) => string) {
  const cityKey = CITY_KEYS[city];
  const countryKey = COUNTRY_KEYS[country];
  return {
    city: cityKey ? translate(cityKey) : city,
    country: countryKey ? translate(countryKey) : country,
  };
}
