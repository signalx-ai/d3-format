import formatDecimal from "./formatDecimal.js";

export var prefixExponent;



function get_exponent_from_prefix_order(prefix_order, grouping, exp_bases){
  let grouping_length = grouping.length

  let val = Math.floor(prefix_order/grouping_length)*exp_bases[exp_bases.length-1] + exp_bases[prefix_order%grouping_length]
  return val
}

function get_appropriate_prefix_order(minimumPrefixOrder, maximumPrefixOrder, exp_value, grouping, exp_bases){
  let prefix_order = minimumPrefixOrder
  for (let index = minimumPrefixOrder; index <= maximumPrefixOrder; index++) {
    const base = get_exponent_from_prefix_order(index, grouping, exp_bases);
    if (exp_value >= base){
      prefix_order = index
      continue
    }
    break
  }
  return Math.max(minimumPrefixOrder, Math.min(maximumPrefixOrder, prefix_order))
}

export function calculate_prefix_exponent(minimumPrefixOrder, maximumPrefixOrder, exp_value, grouping, exp_bases){
  let prefix_order = get_appropriate_prefix_order(minimumPrefixOrder, maximumPrefixOrder, exp_value, grouping, exp_bases)
  return get_exponent_from_prefix_order(prefix_order,grouping, exp_bases);
}

export function calculate_exponent_bases(grouping){
  let exp_bases = [0]
	let base = 0
	for (let index = 0; index < grouping.length; index++) {
		const item = grouping[index];
		base = base + item
		exp_bases.push(base)
  }
  return exp_bases
}

function formatSignificantDigitsForPrefixes(x, p, calc_prefix_exp) {
  var d = formatDecimal(x, p);
  if (!d) return x + "";
  var coefficient = d[0],
      exponent = d[1],
      i = exponent - (calc_prefix_exp(exponent)) + 1,
      n = coefficient.length;
  return i === n ? coefficient
      : i > n ? coefficient + new Array(i - n + 1).join("0")
      : i > 0 ? coefficient.slice(0, i) + "." + coefficient.slice(i)
      : "0." + new Array(1 - i).join("0") + formatDecimal(x, Math.max(0, p + i - 1))[0]; // less than the smallest prefix
}

export function createPrefixExponentAutoForLocale(minimumPrefixOrder, maximumPrefixOrder, grouping){
  let exp_bases = calculate_exponent_bases(grouping)
  
  return function calculateCurrencyPrefixAuto(exp_value) {
    return calculate_prefix_exponent(minimumPrefixOrder, maximumPrefixOrder, exp_value, grouping, exp_bases);
  }
}

export function createPrefixOrderAutoForLocale(minimumPrefixOrder, maximumPrefixOrder, grouping){
  let exp_bases = calculate_exponent_bases(grouping)
  
  return function calculatePrefixOrderAuto(exp_value) {
    return get_appropriate_prefix_order(minimumPrefixOrder, maximumPrefixOrder, exp_value, grouping, exp_bases);
  }
}

export function createFormatCurrencyPrefixAutoForLocale(currencyAbbreviations, grouping) {

	let calc_prefix_exp = createPrefixExponentAutoForLocale(0, currencyAbbreviations.length - 1,grouping)
  
  return function formatCurrencyPrefixAuto(x, p) {
    return formatSignificantDigitsForPrefixes(x, p, calc_prefix_exp);
  }
}

export default function(x, p) {
	let calc_prefix_exp = createPrefixExponentAutoForLocale(-8, 8, [3])
  return formatSignificantDigitsForPrefixes(x, p, calc_prefix_exp);
}
