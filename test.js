console.log("hello ");

let a = 12999990;
let b = 196;

console.log(a*b);
// 25200000
// 25200000
// write the code for a function taht can get the weather of the world or in india
function getWeather(city) {
 
  return new Promise((resolve, reject) => {
    // code to get weather data

    if (city === "India") {
         
      resolve("Weather data for " + city);
    }
    resolve("Weather data for " + city);
  });
}