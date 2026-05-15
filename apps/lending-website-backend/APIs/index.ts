// // // apis/index.ts
// // import Europe from './Europe';
// // import Asia from './Asia';
// // import Africa from './Africa';
// // import Australia from './Australia';
// // import NorthAmerica from './NorthAmerica';
// // import SouthAmerica from './SouthAmerica';

// // import { APIs } from '../types/api';

// // const allAPIs: APIs = {
// //   Europe,
// //   Asia,
// //   Africa,
// //   Australia,
// //   NorthAmerica,
// //   SouthAmerica,
// // };

// // export default allAPIs;

// // also make sevices later. Its code:
// // services/apiClient.ts
// import allAPIs from '../apis';
// import { CountryAPI } from '../types/api';

// export function getAPI(continent: string, country: string): CountryAPI {
//   const continentMap = allAPIs[continent];
//   if (!continentMap) throw new Error(`Continent ${continent} not found`);

//   const countryAPI = continentMap[country];
//   if (!countryAPI) throw new Error(`Country ${country} not found`);

//   return countryAPI;
// }

// // Example usage:
// const nigeriaAPI = getAPI('Africa', 'Nigeria');
// console.log(nigeriaAPI.endpoint);

// .env entries exmples
// NIGERIA_API_URL=https://api.example.com/ng
// NIGERIA_API_KEY=your_nigeria_key

// SOUTH_AFRICA_API_URL=https://api.example.com/za
// SOUTH_AFRICA_API_KEY=your_south_africa_key

// KENYA_API_URL=https://://api.example.com/ke
// KENYA_API_KEY=your_kenya_key
