d3 = require('./dist/d3-format.js')
us = require('./locale/en-US.json')
aa = require('./locale/en-IN.json')
aa['currencyAbbreviations'] = ['','K','Lakh','Crore']
aa['countryCode'] = 'IN'

formats = [
  2,3,5,6,
  7,8,9
]
tests = [-12345678, 123,1234,12345,123456,1234567,12345678,123456789,1234567890,12345678901]

locales = [us, aa]
for (locale of locales){
  console.log(`\n\n-------LOCALE-------`,locale)
  f = d3.formatLocale(locale)
  for(format of formats){
    console.log(`\n\n-----${format}----`)
    ff = f.formatCurrencyPrefix('$,.2K', 10**format)
    for(test of tests){
      console.log(test,  ff(test))
    }
  }
}


// 3,2,2,2,   3,2,2,2   3,2,2,2,   3,2,2,2   3,2,2,2,   3,2,2,2

// 0,3,5,7,9,  12,14,16,18  21,23

// 4
// Math.floor(4/4)*base[5-1] + base[4%4]

// 5
// Math.floor(5/4)*base[5-1] + base[5%4]

// 7
// Math.floor(7/4)*base[5-1] + base[7%4]
// 1*9 + 7
// 16

// 8
// Math.floor(8/4)*base[5-1] + base[8%4]
// 2*9 + 0
// 18

// 17
// Math.floor(17/4)*base[5-1] + base[17%4]
// 4*9 + 3

// 39