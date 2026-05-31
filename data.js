// ⬇️ Replace with real data
// -----------------------------------------------------------------------------
// scout-finder data (global standard, English-only). Decoupled from app.js.
// Hierarchy: WOSM Region -> Country (NSO) -> Unit.
// Schema: { id, name, type, country, country_ko, nso, region, lang, lat, lng,
//           place, sections[], homepage, note }
// Pin color = WOSM Region (SCOUT_REGION_COLORS). Coordinates set in admin via
// OpenStreetMap address search.
// -----------------------------------------------------------------------------

window.SCOUT_UNITS = [
  {
    "id": "kr-yeoksam",
    "name": "Yeoksam Scout Unit",
    "type": "Community unit",
    "country": "Republic of Korea",
    "country_ko": "대한민국",
    "nso": "Korea Scout Association",
    "region": "Asia-Pacific",
    "lang": "English",
    "lat": 37.5006,
    "lng": 127.0364,
    "place": "Yeoksam-dong, Gangnam-gu, Seoul, South Korea",
    "sections": [
      "Beaver",
      "Cub",
      "Scout",
      "Venture"
    ],
    "homepage": "https://instagram.com/",
    "note": "School-linked activities in Gangnam"
  },
  {
    "id": "kr-jamsil",
    "name": "Jamsil Scout Unit",
    "type": "Community unit",
    "country": "Republic of Korea",
    "country_ko": "대한민국",
    "nso": "Korea Scout Association",
    "region": "Asia-Pacific",
    "lang": "English",
    "lat": 37.5133,
    "lng": 127.1001,
    "place": "Jamsil-dong, Songpa-gu, Seoul, South Korea",
    "sections": [
      "Cub",
      "Scout",
      "Venture"
    ],
    "homepage": "",
    "note": "Camping at Han River and Olympic Park"
  },
  {
    "id": "kr-yeongtong",
    "name": "Yeongtong Scout Unit",
    "type": "Community unit",
    "country": "Republic of Korea",
    "country_ko": "대한민국",
    "nso": "Korea Scout Association",
    "region": "Asia-Pacific",
    "lang": "English",
    "lat": 37.2519,
    "lng": 127.0717,
    "place": "Yeongtong-dong, Suwon, Gyeonggi-do, South Korea",
    "sections": [
      "Beaver",
      "Cub",
      "Scout"
    ],
    "homepage": "",
    "note": "Biweekly meetings at Yeongtong Youth Center"
  },
  {
    "id": "kr-haeundae",
    "name": "Haeundae Scout Unit",
    "type": "Community unit",
    "country": "Republic of Korea",
    "country_ko": "대한민국",
    "nso": "Korea Scout Association",
    "region": "Asia-Pacific",
    "lang": "English",
    "lat": 35.1631,
    "lng": 129.1635,
    "place": "Haeundae-gu, Busan, South Korea",
    "sections": [
      "Scout",
      "Venture",
      "Rover"
    ],
    "homepage": "",
    "note": "Coastal and marine activities in Busan"
  },
  {
    "id": "kr-nohyeong",
    "name": "Nohyeong School Unit",
    "type": "School unit",
    "country": "Republic of Korea",
    "country_ko": "대한민국",
    "nso": "Korea Scout Association",
    "region": "Asia-Pacific",
    "lang": "English",
    "lat": 33.4845,
    "lng": 126.4795,
    "place": "Nohyeong-dong, Jeju City, Jeju, South Korea",
    "sections": [
      "Cub",
      "Scout"
    ],
    "homepage": "",
    "note": "Hallasan and coastal trekking"
  },
  {
    "id": "sg-bishan",
    "name": "Bishan Scout Unit",
    "type": "Community unit",
    "country": "Singapore",
    "country_ko": "싱가포르",
    "nso": "The Singapore Scout Association",
    "region": "Asia-Pacific",
    "lang": "English",
    "lat": 1.3508,
    "lng": 103.848,
    "place": "Bishan, Singapore",
    "sections": [
      "Cub",
      "Scout",
      "Venture"
    ],
    "homepage": "https://instagram.com/",
    "note": "Community park activities"
  },
  {
    "id": "sg-tampines",
    "name": "Tampines Scout Unit",
    "type": "Community unit",
    "country": "Singapore",
    "country_ko": "싱가포르",
    "nso": "The Singapore Scout Association",
    "region": "Asia-Pacific",
    "lang": "English",
    "lat": 1.3536,
    "lng": 103.9447,
    "place": "Tampines, Singapore",
    "sections": [
      "Beaver",
      "Cub",
      "Scout"
    ],
    "homepage": "",
    "note": "Eastern region service projects"
  },
  {
    "id": "sg-jurong",
    "name": "Jurong Scout Unit",
    "type": "Community unit",
    "country": "Singapore",
    "country_ko": "싱가포르",
    "nso": "The Singapore Scout Association",
    "region": "Asia-Pacific",
    "lang": "English",
    "lat": 1.3329,
    "lng": 103.7436,
    "place": "Jurong East, Singapore",
    "sections": [
      "Scout",
      "Venture"
    ],
    "homepage": "",
    "note": "Outdoor and pioneering skills"
  },
  {
    "id": "sg-woodlands",
    "name": "Woodlands School Unit",
    "type": "School unit",
    "country": "Singapore",
    "country_ko": "싱가포르",
    "nso": "The Singapore Scout Association",
    "region": "Asia-Pacific",
    "lang": "English",
    "lat": 1.4382,
    "lng": 103.789,
    "place": "Woodlands, Singapore",
    "sections": [
      "Cub",
      "Scout"
    ],
    "homepage": "",
    "note": "School-based unit in the north"
  },
  {
    "id": "sg-bedok",
    "name": "Bedok Scout Unit",
    "type": "Community unit",
    "country": "Singapore",
    "country_ko": "싱가포르",
    "nso": "The Singapore Scout Association",
    "region": "Asia-Pacific",
    "lang": "English",
    "lat": 1.3236,
    "lng": 103.9273,
    "place": "Bedok, Singapore",
    "sections": [
      "Scout",
      "Venture",
      "Rover"
    ],
    "homepage": "",
    "note": "Coastal kayaking and camps"
  },
  {
    "id": "mn-sukhbaatar",
    "name": "Sukhbaatar Scout Unit",
    "type": "Community unit",
    "country": "Mongolia",
    "country_ko": "몽골",
    "nso": "The Scout Association of Mongolia",
    "region": "Asia-Pacific",
    "lang": "English",
    "lat": 47.921,
    "lng": 106.918,
    "place": "Sukhbaatar District, Ulaanbaatar, Mongolia",
    "sections": [
      "Cub",
      "Scout",
      "Venture"
    ],
    "homepage": "",
    "note": "City-center unit in Ulaanbaatar"
  },
  {
    "id": "mn-bayanzurkh",
    "name": "Bayanzurkh Scout Unit",
    "type": "Community unit",
    "country": "Mongolia",
    "country_ko": "몽골",
    "nso": "The Scout Association of Mongolia",
    "region": "Asia-Pacific",
    "lang": "English",
    "lat": 47.917,
    "lng": 106.977,
    "place": "Bayanzurkh District, Ulaanbaatar, Mongolia",
    "sections": [
      "Beaver",
      "Cub",
      "Scout"
    ],
    "homepage": "",
    "note": "Steppe trekking and horsemanship"
  },
  {
    "id": "mn-khanuul",
    "name": "Khan-Uul Scout Unit",
    "type": "Community unit",
    "country": "Mongolia",
    "country_ko": "몽골",
    "nso": "The Scout Association of Mongolia",
    "region": "Asia-Pacific",
    "lang": "English",
    "lat": 47.886,
    "lng": 106.9,
    "place": "Khan-Uul District, Ulaanbaatar, Mongolia",
    "sections": [
      "Scout",
      "Venture"
    ],
    "homepage": "",
    "note": "Tuul River nature activities"
  },
  {
    "id": "mn-darkhan",
    "name": "Darkhan Scout Unit",
    "type": "Community unit",
    "country": "Mongolia",
    "country_ko": "몽골",
    "nso": "The Scout Association of Mongolia",
    "region": "Asia-Pacific",
    "lang": "English",
    "lat": 49.486,
    "lng": 105.922,
    "place": "Darkhan, Mongolia",
    "sections": [
      "Cub",
      "Scout"
    ],
    "homepage": "",
    "note": "Northern industrial city unit"
  },
  {
    "id": "mn-erdenet",
    "name": "Erdenet School Unit",
    "type": "School unit",
    "country": "Mongolia",
    "country_ko": "몽골",
    "nso": "The Scout Association of Mongolia",
    "region": "Asia-Pacific",
    "lang": "English",
    "lat": 49.0278,
    "lng": 104.0444,
    "place": "Erdenet, Mongolia",
    "sections": [
      "Scout",
      "Venture",
      "Rover"
    ],
    "homepage": "",
    "note": "School unit in Erdenet"
  },
  {
    "id": "hk-central",
    "name": "Central Scout Unit",
    "type": "Community unit",
    "country": "Hong Kong",
    "country_ko": "홍콩",
    "nso": "Scout Association of Hong Kong",
    "region": "Asia-Pacific",
    "lang": "English",
    "lat": 22.282,
    "lng": 114.1588,
    "place": "Central, Hong Kong Island, Hong Kong",
    "sections": [
      "Cub",
      "Scout",
      "Venture"
    ],
    "homepage": "https://instagram.com/",
    "note": "Urban service on Hong Kong Island"
  },
  {
    "id": "hk-mongkok",
    "name": "Kowloon Scout Unit",
    "type": "Community unit",
    "country": "Hong Kong",
    "country_ko": "홍콩",
    "nso": "Scout Association of Hong Kong",
    "region": "Asia-Pacific",
    "lang": "English",
    "lat": 22.3193,
    "lng": 114.1694,
    "place": "Mong Kok, Kowloon, Hong Kong",
    "sections": [
      "Beaver",
      "Cub",
      "Scout"
    ],
    "homepage": "",
    "note": "Dense-city community programmes"
  },
  {
    "id": "hk-shatin",
    "name": "Sha Tin Scout Unit",
    "type": "Community unit",
    "country": "Hong Kong",
    "country_ko": "홍콩",
    "nso": "Scout Association of Hong Kong",
    "region": "Asia-Pacific",
    "lang": "English",
    "lat": 22.3771,
    "lng": 114.1974,
    "place": "Sha Tin, New Territories, Hong Kong",
    "sections": [
      "Scout",
      "Venture"
    ],
    "homepage": "",
    "note": "Hiking in the New Territories"
  },
  {
    "id": "hk-tsuenwan",
    "name": "Tsuen Wan Scout Unit",
    "type": "Community unit",
    "country": "Hong Kong",
    "country_ko": "홍콩",
    "nso": "Scout Association of Hong Kong",
    "region": "Asia-Pacific",
    "lang": "English",
    "lat": 22.3711,
    "lng": 114.114,
    "place": "Tsuen Wan, New Territories, Hong Kong",
    "sections": [
      "Cub",
      "Scout"
    ],
    "homepage": "",
    "note": "Country park activities"
  },
  {
    "id": "hk-tuenmun",
    "name": "Tuen Mun School Unit",
    "type": "School unit",
    "country": "Hong Kong",
    "country_ko": "홍콩",
    "nso": "Scout Association of Hong Kong",
    "region": "Asia-Pacific",
    "lang": "English",
    "lat": 22.3908,
    "lng": 113.9725,
    "place": "Tuen Mun, New Territories, Hong Kong",
    "sections": [
      "Scout",
      "Venture",
      "Rover"
    ],
    "homepage": "",
    "note": "School unit in the west NT"
  },
  {
    "id": "tw-taipei",
    "name": "Taipei Scout Unit",
    "type": "Community unit",
    "country": "Scouts of China",
    "country_ko": "중화민국",
    "nso": "The General Association of the Scouts of China",
    "region": "Asia-Pacific",
    "lang": "English",
    "lat": 25.033,
    "lng": 121.5654,
    "place": "Zhongzheng, Taipei, Taiwan",
    "sections": [
      "Cub",
      "Scout",
      "Venture"
    ],
    "homepage": "https://instagram.com/",
    "note": "Capital-city unit in Taipei"
  },
  {
    "id": "tw-xinyi",
    "name": "Xinyi Scout Unit",
    "type": "Community unit",
    "country": "Scouts of China",
    "country_ko": "중화민국",
    "nso": "The General Association of the Scouts of China",
    "region": "Asia-Pacific",
    "lang": "English",
    "lat": 25.033,
    "lng": 121.57,
    "place": "Xinyi District, Taipei, Taiwan",
    "sections": [
      "Beaver",
      "Cub",
      "Scout"
    ],
    "homepage": "",
    "note": "Activities near Taipei 101"
  },
  {
    "id": "tw-taichung",
    "name": "Taichung Scout Unit",
    "type": "Community unit",
    "country": "Scouts of China",
    "country_ko": "중화민국",
    "nso": "The General Association of the Scouts of China",
    "region": "Asia-Pacific",
    "lang": "English",
    "lat": 24.1477,
    "lng": 120.6736,
    "place": "Taichung, Taiwan",
    "sections": [
      "Scout",
      "Venture"
    ],
    "homepage": "",
    "note": "Central Taiwan outdoor programmes"
  },
  {
    "id": "tw-tainan",
    "name": "Tainan School Unit",
    "type": "School unit",
    "country": "Scouts of China",
    "country_ko": "중화민국",
    "nso": "The General Association of the Scouts of China",
    "region": "Asia-Pacific",
    "lang": "English",
    "lat": 22.9999,
    "lng": 120.227,
    "place": "Tainan, Taiwan",
    "sections": [
      "Cub",
      "Scout"
    ],
    "homepage": "",
    "note": "Historic-city school unit"
  },
  {
    "id": "tw-kaohsiung",
    "name": "Kaohsiung Scout Unit",
    "type": "Community unit",
    "country": "Scouts of China",
    "country_ko": "중화민국",
    "nso": "The General Association of the Scouts of China",
    "region": "Asia-Pacific",
    "lang": "English",
    "lat": 22.6273,
    "lng": 120.3014,
    "place": "Kaohsiung, Taiwan",
    "sections": [
      "Scout",
      "Venture",
      "Rover"
    ],
    "homepage": "",
    "note": "Harbor-city marine activities"
  }
];

window.SCOUT_NSOS = [{"country":"Afghanistan","country_ko":"아프가니스탄","nso":"Afghanistan National Scout Organization","region":"Asia-Pacific","lang":"English"},{"country":"Albania","country_ko":"알바니아","nso":"Scouts of Albania","region":"European","lang":"English"},{"country":"Algeria","country_ko":"알제리","nso":"Scouts Musulmans Algériens","region":"Arab","lang":"French"},{"country":"Angola","country_ko":"앙골라","nso":"Associação de Escuteiros de Angola","region":"Africa","lang":"English"},{"country":"Antigua and Barbuda","country_ko":"앤티가 바부다","nso":"Antigua and Barbuda Scout Association","region":"Interamerican","lang":"English"},{"country":"Argentina","country_ko":"아르헨티나","nso":"Scouts de Argentina","region":"Interamerican","lang":"English"},{"country":"Armenia","country_ko":"아르메니아","nso":"Hayastani Azgayin Scautakan Sharjum Kazmakerputiun","region":"European","lang":"English"},{"country":"Aruba","country_ko":"아루바","nso":"Scouting Aruba","region":"Interamerican","lang":"English"},{"country":"Australia","country_ko":"호주","nso":"The Scout Association of Australia","region":"Asia-Pacific","lang":"English"},{"country":"Austria","country_ko":"오스트리아","nso":"Pfadfinder und Pfadfinderinnen Österreichs","region":"European","lang":"English"},{"country":"Azerbaijan","country_ko":"아제르바이잔","nso":"Azerbaycan Skautlar Assosiasiyasi","region":"European","lang":"English"},{"country":"Bahamas","country_ko":"바하마","nso":"The Scout Association of the Bahamas","region":"Interamerican","lang":"English"},{"country":"Bahrain","country_ko":"바레인","nso":"Boy Scouts of Bahrain","region":"Arab","lang":"English"},{"country":"Bangladesh","country_ko":"방글라데시","nso":"Bangladesh Scouts","region":"Asia-Pacific","lang":"English"},{"country":"Barbados","country_ko":"바베이도스","nso":"Barbados Boy Scouts Association","region":"Interamerican","lang":"English"},{"country":"Belarus","country_ko":"벨라루스","nso":"Belarusian Republican Scout Association","region":"European","lang":"English"},{"country":"Belgium","country_ko":"벨기에","nso":"Guidisme et Scoutisme en Belgique","region":"European","lang":"English"},{"country":"Belize","country_ko":"벨리즈","nso":"The Scout Association of Belize","region":"Interamerican","lang":"English"},{"country":"Benin","country_ko":"베냉","nso":"Scoutisme Béninois","region":"Africa","lang":"French"},{"country":"Bhutan","country_ko":"부탄","nso":"Bhutan Scout Association","region":"Asia-Pacific","lang":"English"},{"country":"Plurinational State of Bolivia","country_ko":"볼리비아","nso":"Asociación de Scouts de Bolivia","region":"Interamerican","lang":"English"},{"country":"Bosnia and Herzegovina","country_ko":"보스니아 헤르체고비나","nso":"Scout Association in Bosnia and Herzegovina","region":"European","lang":"English"},{"country":"Botswana","country_ko":"보츠와나","nso":"The Botswana Scouts Association","region":"Africa","lang":"English"},{"country":"Brazil","country_ko":"브라질","nso":"União dos Escoteiros do Brasil","region":"Interamerican","lang":"English"},{"country":"Brunei Darussalam","country_ko":"브루나이","nso":"Persekutuan Pengakap Negara Brunei Darussalam","region":"Asia-Pacific","lang":"English"},{"country":"Bulgaria","country_ko":"불가리아","nso":"Organisation of Bulgarian Scouts","region":"European","lang":"English"},{"country":"Burkina Faso","country_ko":"부르키나파소","nso":"Association des Scouts du Burkina Faso","region":"Africa","lang":"French"},{"country":"Burundi","country_ko":"부룬디","nso":"Association des Scouts du Burundi","region":"Africa","lang":"French"},{"country":"Cabo Verde","country_ko":"카보베르데","nso":"Associação dos Escuteiros de Cabo Verde","region":"Africa","lang":"French"},{"country":"Cambodia","country_ko":"캄보디아","nso":"Cambodia Scouts","region":"Asia-Pacific","lang":"English"},{"country":"Cameroon","country_ko":"카메룬","nso":"Les Scouts du Cameroun","region":"Africa","lang":"French"},{"country":"Canada","country_ko":"캐나다","nso":"Scouts Canada","region":"Interamerican","lang":"English"},{"country":"Chad","country_ko":"차드","nso":"Fédération du Scoutisme Tchadien","region":"Africa","lang":"French"},{"country":"Chile","country_ko":"칠레","nso":"Asociación de Guías y Scouts de Chile","region":"Interamerican","lang":"English"},{"country":"Scouts of China","country_ko":"중화민국","nso":"The General Association of the Scouts of China","region":"Asia-Pacific","lang":"English"},{"country":"Colombia","country_ko":"콜롬비아","nso":"Asociación Scouts de Colombia","region":"Interamerican","lang":"English"},{"country":"Comoros","country_ko":"코모로","nso":"Wezo Mbeli","region":"Africa","lang":"French"},{"country":"Congo","country_ko":"콩고","nso":"Scoutisme Congolais","region":"Africa","lang":"French"},{"country":"Democratic Republic of the Congo","country_ko":"콩고 민주 공화국","nso":"Fédération des Scouts de la République Démocratique du Congo","region":"Africa","lang":"French"},{"country":"Costa Rica","country_ko":"코스타리카","nso":"Asociación de Guías y Scouts de Costa Rica","region":"Interamerican","lang":"English"},{"country":"Côte d'Ivoire","country_ko":"코트디부아르","nso":"Fédération Ivoirienne du Scoutisme","region":"Africa","lang":"French"},{"country":"Croatia","country_ko":"크로아티아","nso":"Savez izvidaca Hrvatske","region":"European","lang":"English"},{"country":"Curaçao","country_ko":"퀴라소","nso":"Scouting Antiano","region":"Interamerican","lang":"English"},{"country":"Cyprus","country_ko":"키프로스","nso":"Cyprus Scouts Association","region":"European","lang":"English"},{"country":"Czechia","country_ko":"체코","nso":"Junák – český skaut","region":"European","lang":"English"},{"country":"Denmark","country_ko":"덴마크","nso":"The Danish Scout Council","region":"European","lang":"English"},{"country":"Dominica","country_ko":"도미니카","nso":"The Scout Association of Dominica","region":"Interamerican","lang":"English"},{"country":"Dominican Republic","country_ko":"도미니카 공화국","nso":"Asociación de Scouts Dominicanos","region":"Interamerican","lang":"English"},{"country":"Ecuador","country_ko":"에콰도르","nso":"Asociación de Scouts del Ecuador","region":"Interamerican","lang":"English"},{"country":"Egypt","country_ko":"이집트","nso":"Egyptian Scout Federation","region":"Arab","lang":"English"},{"country":"El Salvador","country_ko":"엘살바도르","nso":"Asociación de Scouts de El Salvador","region":"Interamerican","lang":"English"},{"country":"Estonia","country_ko":"에스토니아","nso":"Eesti Skautide Ühing","region":"European","lang":"English"},{"country":"Eswatini","country_ko":"에스와티니","nso":"Eswatini Scout Association","region":"Africa","lang":"English"},{"country":"Ethiopia","country_ko":"에티오피아","nso":"Ethiopia Scout Association","region":"Africa","lang":"English"},{"country":"Fiji","country_ko":"피지","nso":"Fiji Scouts Association","region":"Asia-Pacific","lang":"English"},{"country":"Finland","country_ko":"핀란드","nso":"Suomen Partiolaiset - Finlands Scouter","region":"European","lang":"English"},{"country":"France","country_ko":"프랑스","nso":"Scoutisme Français","region":"European","lang":"French"},{"country":"Gabon","country_ko":"가봉","nso":"Fédération Gabonaise du Scoutisme","region":"Africa","lang":"French"},{"country":"Gambia","country_ko":"감비아","nso":"The Gambia Scout Association","region":"Africa","lang":"English"},{"country":"Georgia","country_ko":"조지아","nso":"Sakartvelos Skauturi Modzraobis Organizatsia","region":"European","lang":"English"},{"country":"Germany","country_ko":"독일","nso":"Ring deutscher Pfadfinder*innenverbände","region":"European","lang":"English"},{"country":"Ghana","country_ko":"가나","nso":"The Ghana Scout Association","region":"Africa","lang":"English"},{"country":"Greece","country_ko":"그리스","nso":"Soma Hellinon Proskopon","region":"European","lang":"English"},{"country":"Grenada","country_ko":"그레나다","nso":"The Scout Association of Grenada","region":"Interamerican","lang":"English"},{"country":"Guatemala","country_ko":"과테말라","nso":"Asociación de Scouts de Guatemala","region":"Interamerican","lang":"English"},{"country":"Guinea","country_ko":"기니","nso":"Association Nationale des Scouts de Guinée","region":"Africa","lang":"French"},{"country":"Guinea-Bissau","country_ko":"기니비사우","nso":"Escuteiros da Guiné Bissau","region":"Africa","lang":"French"},{"country":"Guyana","country_ko":"가이아나","nso":"The Scout Association of Guyana","region":"Interamerican","lang":"English"},{"country":"Haiti","country_ko":"아이티","nso":"Association Nationale des Scouts D'Haïti","region":"Interamerican","lang":"French"},{"country":"Honduras","country_ko":"온두라스","nso":"Asociación de Scouts de Honduras","region":"Interamerican","lang":"English"},{"country":"Hong Kong","country_ko":"홍콩","nso":"Scout Association of Hong Kong","region":"Asia-Pacific","lang":"English"},{"country":"Hungary","country_ko":"헝가리","nso":"Magyar Cserkészszövetség","region":"European","lang":"English"},{"country":"Iceland","country_ko":"아이슬란드","nso":"Bandalag íslenskra Skáta","region":"European","lang":"English"},{"country":"India","country_ko":"인도","nso":"The Bharat Scouts and Guides","region":"Asia-Pacific","lang":"English"},{"country":"Indonesia","country_ko":"인도네시아","nso":"Gerakan Pramuka","region":"Asia-Pacific","lang":"English"},{"country":"Iraq","country_ko":"이라크","nso":"Iraq Scout Association","region":"Arab","lang":"English"},{"country":"Ireland","country_ko":"아일랜드","nso":"Scouting Ireland","region":"European","lang":"English"},{"country":"Israel","country_ko":"이스라엘","nso":"Hitachdut Hatsofim Ve Hatsofot Be Israel","region":"European","lang":"English"},{"country":"Italy","country_ko":"이탈리아","nso":"Federazione Italiana dello Scautismo","region":"European","lang":"English"},{"country":"Jamaica","country_ko":"자메이카","nso":"The Scout Association of Jamaica","region":"Interamerican","lang":"English"},{"country":"Japan","country_ko":"일본","nso":"Scout Association of Japan","region":"Asia-Pacific","lang":"English"},{"country":"Jordan","country_ko":"요르단","nso":"The Jordanian Association for Boy Scouts and Girl Guides","region":"Arab","lang":"English"},{"country":"Kazakhstan","country_ko":"카자흐스탄","nso":"Organisation of the Scout Movement of Kazakhstan","region":"Asia-Pacific","lang":"English"},{"country":"Kenya","country_ko":"케냐","nso":"The Kenya Scouts Association","region":"Africa","lang":"English"},{"country":"Kiribati","country_ko":"키리바시","nso":"Kiribati Scout Association","region":"Asia-Pacific","lang":"English"},{"country":"Republic of Korea","country_ko":"대한민국","nso":"Korea Scout Association","region":"Asia-Pacific","lang":"English"},{"country":"Kuwait","country_ko":"쿠웨이트","nso":"Kuwait Boy Scouts Association","region":"Arab","lang":"English"},{"country":"Latvia","country_ko":"라트비아","nso":"Latvijas Skautu un Gaidu centrala organizacija","region":"European","lang":"English"},{"country":"Lebanon","country_ko":"레바논","nso":"Lebanese Scouting Federation","region":"Arab","lang":"English"},{"country":"Lesotho","country_ko":"레소토","nso":"Lesotho Scouts Association","region":"Africa","lang":"English"},{"country":"Liberia","country_ko":"라이베리아","nso":"Liberia Scout Association","region":"Africa","lang":"English"},{"country":"Libya","country_ko":"리비아","nso":"Boy Scouts and Girl Guides of Libya","region":"Arab","lang":"English"},{"country":"Liechtenstein","country_ko":"리히텐슈타인","nso":"Pfadfinder und Pfadfinderinnen Liechtensteins","region":"European","lang":"English"},{"country":"Lithuania","country_ko":"리투아니아","nso":"Lietuvos Skautija","region":"European","lang":"English"},{"country":"Luxembourg","country_ko":"룩셈부르크","nso":"Scouting in Luxembourg","region":"European","lang":"French"},{"country":"Macao","country_ko":"마카오","nso":"The Scout Association of Macau","region":"Asia-Pacific","lang":"English"},{"country":"Madagascar","country_ko":"마다가스카르","nso":"Firaisan'ny Skotisma eto Madagasikara","region":"Africa","lang":"French"},{"country":"Malawi","country_ko":"말라위","nso":"Scout Association of Malawi","region":"Africa","lang":"English"},{"country":"Malaysia","country_ko":"말레이시아","nso":"Persekutuan Pengakap Malaysia","region":"Asia-Pacific","lang":"English"},{"country":"Maldives","country_ko":"몰디브","nso":"Scout Association of Maldives","region":"Asia-Pacific","lang":"English"},{"country":"Mali","country_ko":"말리","nso":"Association des Scouts et Guides du Mali","region":"Africa","lang":"English"},{"country":"Malta","country_ko":"몰타","nso":"The Scout Association of Malta","region":"European","lang":"English"},{"country":"Mauritania","country_ko":"모리타니","nso":"Association des Scouts et Guides de Mauritanie","region":"Arab","lang":"French"},{"country":"Mauritius","country_ko":"모리셔스","nso":"The Mauritius Scouts Association","region":"Africa","lang":"English"},{"country":"Mexico","country_ko":"멕시코","nso":"Asociación de Scouts de México","region":"Interamerican","lang":"English"},{"country":"Republic of Moldova","country_ko":"몰도바","nso":"Asociatia Nationala A Scoutilor Din Moldova","region":"European","lang":"English"},{"country":"Monaco","country_ko":"모나코","nso":"Association des Guides et Scouts de Monaco","region":"European","lang":"French"},{"country":"Mongolia","country_ko":"몽골","nso":"The Scout Association of Mongolia","region":"Asia-Pacific","lang":"English"},{"country":"Montenegro","country_ko":"몬테네그로","nso":"Savez Izvidjaca Crne Gore","region":"European","lang":"English"},{"country":"Morocco","country_ko":"모로코","nso":"Fédération Nationale du Scoutisme Marocain","region":"Arab","lang":"French"},{"country":"Mozambique","country_ko":"모잠비크","nso":"Liga dos Escuteiros de Moçambique","region":"Africa","lang":"English"},{"country":"Myanmar","country_ko":"미얀마","nso":"Myanmar Scout","region":"Asia-Pacific","lang":"English"},{"country":"Namibia","country_ko":"나미비아","nso":"Scouts of Namibia","region":"Africa","lang":"English"},{"country":"Nepal","country_ko":"네팔","nso":"Nepal Scouts","region":"Asia-Pacific","lang":"English"},{"country":"Netherlands","country_ko":"네덜란드","nso":"Scouting Nederland","region":"European","lang":"English"},{"country":"New Zealand","country_ko":"뉴질랜드","nso":"Scouts New Zealand","region":"Asia-Pacific","lang":"English"},{"country":"Nicaragua","country_ko":"니카라과","nso":"Asociación de Scouts de Nicaragua","region":"Interamerican","lang":"English"},{"country":"Niger","country_ko":"니제르","nso":"Association des Scouts du Niger","region":"Africa","lang":"French"},{"country":"Nigeria","country_ko":"나이지리아","nso":"The Scout Association of Nigeria","region":"Africa","lang":"English"},{"country":"North Macedonia","country_ko":"북마케도니아","nso":"Sojuz na Izvidnici na Makedonija","region":"European","lang":"English"},{"country":"Norway","country_ko":"노르웨이","nso":"Speiderne i Norge","region":"European","lang":"English"},{"country":"Oman","country_ko":"오만","nso":"The National Organization for Scouts and Guides","region":"Arab","lang":"English"},{"country":"Pakistan","country_ko":"파키스탄","nso":"Pakistan Boy Scouts Association","region":"Asia-Pacific","lang":"English"},{"country":"State of Palestine","country_ko":"팔레스타인","nso":"Palestinian Scout Association","region":"Arab","lang":"English"},{"country":"Panama","country_ko":"파나마","nso":"Asociación Nacional de Scouts de Panamá","region":"Interamerican","lang":"English"},{"country":"Papua New Guinea","country_ko":"파푸아뉴기니","nso":"The Scout Association of Papua New Guinea","region":"Asia-Pacific","lang":"English"},{"country":"Paraguay","country_ko":"파라과이","nso":"Asociación de Scouts del Paraguay","region":"Interamerican","lang":"English"},{"country":"Peru","country_ko":"페루","nso":"Asociación de Scouts del Perú","region":"Interamerican","lang":"English"},{"country":"Philippines","country_ko":"필리핀","nso":"Boy Scouts of the Philippines","region":"Asia-Pacific","lang":"English"},{"country":"Poland","country_ko":"폴란드","nso":"Związek Harcerstwa Polskiego","region":"European","lang":"English"},{"country":"Portugal","country_ko":"포르투갈","nso":"Federação Escutista de Portugal","region":"European","lang":"English"},{"country":"Qatar","country_ko":"카타르","nso":"Qatar Boy Scouts Association","region":"Arab","lang":"English"},{"country":"Romania","country_ko":"루마니아","nso":"Cercetasii României","region":"European","lang":"English"},{"country":"Russian Federation","country_ko":"러시아","nso":"All-Russian Scout Association","region":"Asia-Pacific","lang":"English"},{"country":"Rwanda","country_ko":"르완다","nso":"Rwanda Scouts Association","region":"Africa","lang":"English"},{"country":"Saint Lucia","country_ko":"세인트루시아","nso":"The Saint Lucia Scout Association","region":"Interamerican","lang":"English"},{"country":"Saint Vincent and the Grenadines","country_ko":"세인트빈센트 그레나딘","nso":"The Scout Association of Saint Vincent and the Grenadines","region":"Interamerican","lang":"English"},{"country":"San Marino","country_ko":"산마리노","nso":"Associazione Guide e Esploratori Cattolici Sammarinesi","region":"European","lang":"English"},{"country":"Sao Tome and Principe","country_ko":"상투메 프린시페","nso":"Associação dos Escuteiros de São Tomé e Príncipe","region":"Africa","lang":"English"},{"country":"Saudi Arabia","country_ko":"사우디아라비아","nso":"Saudi Arabian Scouts Association","region":"Arab","lang":"English"},{"country":"Senegal","country_ko":"세네갈","nso":"Confédération Sénégalaise du Scoutisme","region":"Africa","lang":"French"},{"country":"Serbia","country_ko":"세르비아","nso":"Savez Izvidjača Srbije","region":"European","lang":"English"},{"country":"Seychelles","country_ko":"세이셸","nso":"The Seychelles Scouts Association","region":"Africa","lang":"English"},{"country":"Sierra Leone","country_ko":"시에라리온","nso":"Sierra Leone Scouts Association","region":"Africa","lang":"English"},{"country":"Singapore","country_ko":"싱가포르","nso":"The Singapore Scout Association","region":"Asia-Pacific","lang":"English"},{"country":"Slovakia","country_ko":"슬로바키아","nso":"Slovensky skauting","region":"European","lang":"English"},{"country":"Slovenia","country_ko":"슬로베니아","nso":"Zveza tabornikov Slovenije","region":"European","lang":"English"},{"country":"Solomon Islands","country_ko":"솔로몬 제도","nso":"Solomon Islands Scout Association","region":"Asia-Pacific","lang":"English"},{"country":"South Africa","country_ko":"남아프리카 공화국","nso":"Scouts South Africa","region":"Africa","lang":"English"},{"country":"South Sudan","country_ko":"남수단","nso":"South Sudan Scout Association","region":"Africa","lang":"English"},{"country":"Spain","country_ko":"스페인","nso":"Federación de Escultismo en España","region":"European","lang":"English"},{"country":"Sri Lanka","country_ko":"스리랑카","nso":"Sri Lanka Scout Association","region":"Asia-Pacific","lang":"English"},{"country":"Sudan","country_ko":"수단","nso":"Sudan Scouts Association","region":"Arab","lang":"English"},{"country":"Suriname","country_ko":"수리남","nso":"Boy Scouts van Suriname","region":"Interamerican","lang":"English"},{"country":"Sweden","country_ko":"스웨덴","nso":"Scouterna","region":"European","lang":"English"},{"country":"Switzerland","country_ko":"스위스","nso":"Mouvement Scout de Suisse","region":"European","lang":"French"},{"country":"Syrian Arab Republic","country_ko":"시리아","nso":"Scouts of Syria","region":"Arab","lang":"English"},{"country":"Tajikistan","country_ko":"타지키스탄","nso":"Ittihodi Scouthoi Tochikiston","region":"Asia-Pacific","lang":"English"},{"country":"United Republic of Tanzania","country_ko":"탄자니아","nso":"Tanzania Scouts Association","region":"Africa","lang":"English"},{"country":"Thailand","country_ko":"태국","nso":"National Scout Organization of Thailand","region":"Asia-Pacific","lang":"English"},{"country":"Timor-Leste","country_ko":"동티모르","nso":"União Nacional dos Escuteiros de Timor-Leste","region":"Asia-Pacific","lang":"English"},{"country":"Togo","country_ko":"토고","nso":"Association Scoute du Togo","region":"Africa","lang":"French"},{"country":"Trinidad and Tobago","country_ko":"트리니다드 토바고","nso":"The Scout Association of Trinidad and Tobago","region":"Interamerican","lang":"English"},{"country":"Tunisia","country_ko":"튀니지","nso":"Les Scouts Tunisiens","region":"Arab","lang":"French"},{"country":"Türkiye","country_ko":"터키","nso":"Türkiye İzcilik Federasyonu","region":"European","lang":"English"},{"country":"Uganda","country_ko":"우간다","nso":"Uganda Scout Association","region":"Africa","lang":"English"},{"country":"Ukraine","country_ko":"우크라이나","nso":"National Organization of Scouts of Ukraine","region":"European","lang":"English"},{"country":"United Arab Emirates","country_ko":"아랍에미리트","nso":"Emirates Scout Association","region":"Arab","lang":"English"},{"country":"United Kingdom","country_ko":"영국","nso":"The Scout Association","region":"European","lang":"English"},{"country":"United States of America","country_ko":"미국","nso":"Boy Scouts of America","region":"Interamerican","lang":"English"},{"country":"Uruguay","country_ko":"우루과이","nso":"Movimiento Scout del Uruguay","region":"Interamerican","lang":"English"},{"country":"Bolivarian Republic of Venezuela","country_ko":"베네수엘라","nso":"Asociación de Scouts de Venezuela","region":"Interamerican","lang":"English"},{"country":"Viet Nam","country_ko":"베트남","nso":"Pathfinder Scouts Vietnam","region":"Asia-Pacific","lang":"English"},{"country":"Yemen","country_ko":"예멘","nso":"Yemen Scout Association","region":"Arab","lang":"English"},{"country":"Zambia","country_ko":"잠비아","nso":"Zambia Scouts Association","region":"Africa","lang":"English"},{"country":"Zimbabwe","country_ko":"짐바브웨","nso":"The Scout Association of Zimbabwe","region":"Africa","lang":"English"}];

window.SCOUT_REGION_COLORS = {
  "Asia-Pacific": "#622599",
  "European": "#0094b4",
  "Arab": "#248737",
  "Africa": "#d5521a",
  "Interamerican": "#c2189e"
};
