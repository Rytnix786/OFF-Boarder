const ALL_IANA_TIMEZONES = [
  "Africa/Abidjan", "Africa/Accra", "Africa/Addis_Ababa", "Africa/Algiers",
  "Africa/Cairo", "Africa/Casablanca", "Africa/Dar_es_Salaam", "Africa/Johannesburg",
  "Africa/Khartoum", "Africa/Lagos", "Africa/Nairobi", "Africa/Tripoli", "Africa/Tunis",
  "America/Anchorage", "America/Argentina/Buenos_Aires", "America/Bogota",
  "America/Caracas", "America/Chicago", "America/Denver", "America/Detroit",
  "America/Edmonton", "America/Guatemala", "America/Halifax", "America/Havana",
  "America/Indiana/Indianapolis", "America/La_Paz", "America/Lima", "America/Los_Angeles",
  "America/Managua", "America/Manaus", "America/Mexico_City", "America/Monterrey",
  "America/Montevideo", "America/New_York", "America/Panama", "America/Phoenix",
  "America/Regina", "America/Santiago", "America/Sao_Paulo", "America/St_Johns",
  "America/Tijuana", "America/Toronto", "America/Vancouver", "America/Winnipeg",
  "Asia/Almaty", "Asia/Amman", "Asia/Baghdad", "Asia/Baku", "Asia/Bangkok",
  "Asia/Beirut", "Asia/Colombo", "Asia/Damascus", "Asia/Dhaka", "Asia/Dubai",
  "Asia/Ho_Chi_Minh", "Asia/Hong_Kong", "Asia/Irkutsk", "Asia/Istanbul",
  "Asia/Jakarta", "Asia/Jerusalem", "Asia/Kabul", "Asia/Kamchatka", "Asia/Karachi",
  "Asia/Kathmandu", "Asia/Kolkata", "Asia/Krasnoyarsk", "Asia/Kuala_Lumpur",
  "Asia/Kuwait", "Asia/Magadan", "Asia/Manila", "Asia/Muscat", "Asia/Nicosia",
  "Asia/Novosibirsk", "Asia/Riyadh", "Asia/Seoul", "Asia/Shanghai", "Asia/Singapore",
  "Asia/Taipei", "Asia/Tashkent", "Asia/Tbilisi", "Asia/Tehran", "Asia/Tokyo",
  "Asia/Vladivostok", "Asia/Yakutsk", "Asia/Yangon", "Asia/Yekaterinburg",
  "Atlantic/Azores", "Atlantic/Cape_Verde", "Atlantic/Reykjavik", "Atlantic/South_Georgia",
  "Australia/Adelaide", "Australia/Brisbane", "Australia/Darwin", "Australia/Hobart",
  "Australia/Melbourne", "Australia/Perth", "Australia/Sydney",
  "Europe/Amsterdam", "Europe/Athens", "Europe/Belgrade", "Europe/Berlin",
  "Europe/Brussels", "Europe/Bucharest", "Europe/Budapest", "Europe/Copenhagen",
  "Europe/Dublin", "Europe/Helsinki", "Europe/Istanbul", "Europe/Kyiv",
  "Europe/Lisbon", "Europe/London", "Europe/Madrid", "Europe/Minsk",
  "Europe/Moscow", "Europe/Oslo", "Europe/Paris", "Europe/Prague",
  "Europe/Riga", "Europe/Rome", "Europe/Sofia", "Europe/Stockholm",
  "Europe/Tallinn", "Europe/Vienna", "Europe/Vilnius", "Europe/Warsaw", "Europe/Zurich",
  "Pacific/Apia", "Pacific/Auckland", "Pacific/Fiji", "Pacific/Guam",
  "Pacific/Honolulu", "Pacific/Kiritimati", "Pacific/Noumea", "Pacific/Pago_Pago",
  "Pacific/Port_Moresby", "Pacific/Tongatapu",
  "UTC"
];

const TIMEZONE_LABELS: Record<string, string> = {
  "Africa/Abidjan": "Abidjan, Ivory Coast",
  "Africa/Accra": "Accra, Ghana",
  "Africa/Addis_Ababa": "Addis Ababa, Ethiopia",
  "Africa/Algiers": "Algiers, Algeria",
  "Africa/Cairo": "Cairo, Egypt",
  "Africa/Casablanca": "Casablanca, Morocco",
  "Africa/Dar_es_Salaam": "Dar es Salaam, Tanzania",
  "Africa/Johannesburg": "Johannesburg, South Africa",
  "Africa/Khartoum": "Khartoum, Sudan",
  "Africa/Lagos": "Lagos, Nigeria",
  "Africa/Nairobi": "Nairobi, Kenya",
  "Africa/Tripoli": "Tripoli, Libya",
  "Africa/Tunis": "Tunis, Tunisia",
  "America/Anchorage": "Anchorage, Alaska",
  "America/Argentina/Buenos_Aires": "Buenos Aires, Argentina",
  "America/Bogota": "Bogota, Colombia",
  "America/Caracas": "Caracas, Venezuela",
  "America/Chicago": "Chicago, Central Time",
  "America/Denver": "Denver, Mountain Time",
  "America/Detroit": "Detroit, Michigan",
  "America/Edmonton": "Edmonton, Canada",
  "America/Guatemala": "Guatemala City",
  "America/Halifax": "Halifax, Atlantic Canada",
  "America/Havana": "Havana, Cuba",
  "America/Indiana/Indianapolis": "Indianapolis, Indiana",
  "America/La_Paz": "La Paz, Bolivia",
  "America/Lima": "Lima, Peru",
  "America/Los_Angeles": "Los Angeles, Pacific Time",
  "America/Managua": "Managua, Nicaragua",
  "America/Manaus": "Manaus, Brazil",
  "America/Mexico_City": "Mexico City, Mexico",
  "America/Monterrey": "Monterrey, Mexico",
  "America/Montevideo": "Montevideo, Uruguay",
  "America/New_York": "New York, Eastern Time",
  "America/Panama": "Panama City, Panama",
  "America/Phoenix": "Phoenix, Arizona",
  "America/Regina": "Regina, Saskatchewan",
  "America/Santiago": "Santiago, Chile",
  "America/Sao_Paulo": "São Paulo, Brazil",
  "America/St_Johns": "St. John's, Newfoundland",
  "America/Tijuana": "Tijuana, Baja California",
  "America/Toronto": "Toronto, Canada",
  "America/Vancouver": "Vancouver, Canada",
  "America/Winnipeg": "Winnipeg, Canada",
  "Asia/Almaty": "Almaty, Kazakhstan",
  "Asia/Amman": "Amman, Jordan",
  "Asia/Baghdad": "Baghdad, Iraq",
  "Asia/Baku": "Baku, Azerbaijan",
  "Asia/Bangkok": "Bangkok, Thailand",
  "Asia/Beirut": "Beirut, Lebanon",
  "Asia/Colombo": "Colombo, Sri Lanka",
  "Asia/Damascus": "Damascus, Syria",
  "Asia/Dhaka": "Dhaka, Bangladesh",
  "Asia/Dubai": "Dubai, UAE",
  "Asia/Ho_Chi_Minh": "Ho Chi Minh City, Vietnam",
  "Asia/Hong_Kong": "Hong Kong",
  "Asia/Irkutsk": "Irkutsk, Russia",
  "Asia/Istanbul": "Istanbul, Turkey",
  "Asia/Jakarta": "Jakarta, Indonesia",
  "Asia/Jerusalem": "Jerusalem, Israel",
  "Asia/Kabul": "Kabul, Afghanistan",
  "Asia/Kamchatka": "Kamchatka, Russia",
  "Asia/Karachi": "Karachi, Pakistan",
  "Asia/Kathmandu": "Kathmandu, Nepal",
  "Asia/Kolkata": "Kolkata, India",
  "Asia/Krasnoyarsk": "Krasnoyarsk, Russia",
  "Asia/Kuala_Lumpur": "Kuala Lumpur, Malaysia",
  "Asia/Kuwait": "Kuwait City, Kuwait",
  "Asia/Magadan": "Magadan, Russia",
  "Asia/Manila": "Manila, Philippines",
  "Asia/Muscat": "Muscat, Oman",
  "Asia/Nicosia": "Nicosia, Cyprus",
  "Asia/Novosibirsk": "Novosibirsk, Russia",
  "Asia/Riyadh": "Riyadh, Saudi Arabia",
  "Asia/Seoul": "Seoul, South Korea",
  "Asia/Shanghai": "Shanghai, China",
  "Asia/Singapore": "Singapore",
  "Asia/Taipei": "Taipei, Taiwan",
  "Asia/Tashkent": "Tashkent, Uzbekistan",
  "Asia/Tbilisi": "Tbilisi, Georgia",
  "Asia/Tehran": "Tehran, Iran",
  "Asia/Tokyo": "Tokyo, Japan",
  "Asia/Vladivostok": "Vladivostok, Russia",
  "Asia/Yakutsk": "Yakutsk, Russia",
  "Asia/Yangon": "Yangon, Myanmar",
  "Asia/Yekaterinburg": "Yekaterinburg, Russia",
  "Atlantic/Azores": "Azores, Portugal",
  "Atlantic/Cape_Verde": "Cape Verde",
  "Atlantic/Reykjavik": "Reykjavik, Iceland",
  "Atlantic/South_Georgia": "South Georgia Island",
  "Australia/Adelaide": "Adelaide, Australia",
  "Australia/Brisbane": "Brisbane, Australia",
  "Australia/Darwin": "Darwin, Australia",
  "Australia/Hobart": "Hobart, Tasmania",
  "Australia/Melbourne": "Melbourne, Australia",
  "Australia/Perth": "Perth, Australia",
  "Australia/Sydney": "Sydney, Australia",
  "Europe/Amsterdam": "Amsterdam, Netherlands",
  "Europe/Athens": "Athens, Greece",
  "Europe/Belgrade": "Belgrade, Serbia",
  "Europe/Berlin": "Berlin, Germany",
  "Europe/Brussels": "Brussels, Belgium",
  "Europe/Bucharest": "Bucharest, Romania",
  "Europe/Budapest": "Budapest, Hungary",
  "Europe/Copenhagen": "Copenhagen, Denmark",
  "Europe/Dublin": "Dublin, Ireland",
  "Europe/Helsinki": "Helsinki, Finland",
  "Europe/Istanbul": "Istanbul, Turkey",
  "Europe/Kyiv": "Kyiv, Ukraine",
  "Europe/Lisbon": "Lisbon, Portugal",
  "Europe/London": "London, UK",
  "Europe/Madrid": "Madrid, Spain",
  "Europe/Minsk": "Minsk, Belarus",
  "Europe/Moscow": "Moscow, Russia",
  "Europe/Oslo": "Oslo, Norway",
  "Europe/Paris": "Paris, France",
  "Europe/Prague": "Prague, Czech Republic",
  "Europe/Riga": "Riga, Latvia",
  "Europe/Rome": "Rome, Italy",
  "Europe/Sofia": "Sofia, Bulgaria",
  "Europe/Stockholm": "Stockholm, Sweden",
  "Europe/Tallinn": "Tallinn, Estonia",
  "Europe/Vienna": "Vienna, Austria",
  "Europe/Vilnius": "Vilnius, Lithuania",
  "Europe/Warsaw": "Warsaw, Poland",
  "Europe/Zurich": "Zurich, Switzerland",
  "Pacific/Apia": "Apia, Samoa",
  "Pacific/Auckland": "Auckland, New Zealand",
  "Pacific/Fiji": "Fiji",
  "Pacific/Guam": "Guam",
  "Pacific/Honolulu": "Honolulu, Hawaii",
  "Pacific/Kiritimati": "Kiritimati, Line Islands",
  "Pacific/Noumea": "Noumea, New Caledonia",
  "Pacific/Pago_Pago": "Pago Pago, American Samoa",
  "Pacific/Port_Moresby": "Port Moresby, Papua New Guinea",
  "Pacific/Tongatapu": "Tongatapu, Tonga",
  "UTC": "Coordinated Universal Time (UTC)"
};

export function getUtcOffset(timezone: string): string {
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      timeZoneName: "shortOffset"
    });
    const parts = formatter.formatToParts(now);
    const offsetPart = parts.find(p => p.type === "timeZoneName");
    if (offsetPart) {
      const offset = offsetPart.value;
      if (offset === "GMT") return "UTC+00:00";
      return offset.replace("GMT", "UTC");
    }
    return "UTC";
  } catch {
    return "UTC";
  }
}

export interface TimezoneOption {
  value: string;
  label: string;
  offset: string;
  searchTerms: string;
}

export function getTimezoneOptions(): TimezoneOption[] {
  return ALL_IANA_TIMEZONES.map(tz => {
    const offset = getUtcOffset(tz);
    const label = TIMEZONE_LABELS[tz] || tz.replace(/_/g, " ").replace(/\//g, " - ");
    return {
      value: tz,
      label,
      offset,
      searchTerms: `${tz} ${label} ${offset}`.toLowerCase()
    };
  }).sort((a, b) => {
    const aOffset = parseOffset(a.offset);
    const bOffset = parseOffset(b.offset);
    if (aOffset !== bOffset) return aOffset - bOffset;
    return a.label.localeCompare(b.label);
  });
}

function parseOffset(offset: string): number {
  const match = offset.match(/UTC([+-])(\d{1,2}):?(\d{2})?/);
  if (!match) return 0;
  const sign = match[1] === "+" ? 1 : -1;
  const hours = parseInt(match[2], 10);
  const minutes = parseInt(match[3] || "0", 10);
  return sign * (hours * 60 + minutes);
}

export function getTimezoneDisplay(timezone: string): string {
  const offset = getUtcOffset(timezone);
  const label = TIMEZONE_LABELS[timezone] || timezone.replace(/_/g, " ").replace(/\//g, " - ");
  return `${offset} — ${label}`;
}

export function isValidTimezone(timezone: string): boolean {
  return ALL_IANA_TIMEZONES.includes(timezone);
}

export const TIMEZONE_VALUES = ALL_IANA_TIMEZONES;
