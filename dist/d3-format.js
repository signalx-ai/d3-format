// https://d3js.org/d3-format/ v1.4.3 Copyright 2021 Mike Bostock
(function (global, factory) {
typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
typeof define === 'function' && define.amd ? define(['exports'], factory) :
(global = global || self, factory(global.d3 = global.d3 || {}));
}(this, (function (exports) { 'use strict';

// Computes the decimal coefficient and exponent of the specified number x with
// significant digits p, where x is positive and p is in [1, 21] or undefined.
// For example, formatDecimal(1.23) returns ["123", 0].
function formatDecimal(x, p) {
  if ((i = (x = p ? x.toExponential(p - 1) : x.toExponential()).indexOf("e")) < 0) return null; // NaN, ±Infinity
  var i, coefficient = x.slice(0, i);

  // The string returned by toExponential either has the form \d\.\d+e[-+]\d+
  // (e.g., 1.2e+3) or the form \de[-+]\d+ (e.g., 1e+3).
  return [
    coefficient.length > 1 ? coefficient[0] + coefficient.slice(2) : coefficient,
    +x.slice(i + 1)
  ];
}

function exponent(x) {
  return x = formatDecimal(Math.abs(x)), x ? x[1] : NaN;
}

function createPrecisionPrefix(minimumPrefixOrder, maximumPrefixOrder) {
  return function (step, value) {
    return Math.max(0, Math.max(minimumPrefixOrder, Math.min(maximumPrefixOrder, Math.floor(exponent(value) / 3))) * 3 - exponent(Math.abs(step)));
  }
}

var precisionPrefix = createPrecisionPrefix(-8, 8);

var currencyPrecisionPrefix = createPrecisionPrefix(0, 4);

function formatGroup(grouping, thousands) {
  return function(value, width) {
    var i = value.length,
        t = [],
        j = 0,
        g = grouping[0],
        length = 0;

    while (i > 0 && g > 0) {
      if (length + g + 1 > width) g = Math.max(1, width - length);
      t.push(value.substring(i -= g, i + g));
      if ((length += g + 1) > width) break;
      g = grouping[j = (j + 1) % grouping.length];
    }

    return t.reverse().join(thousands);
  };
}

function formatNumerals(numerals) {
  return function(value) {
    return value.replace(/[0-9]/g, function(i) {
      return numerals[+i];
    });
  };
}

// [[fill]align][sign][symbol][0][width][,][.precision][~][type]
var re = /^(?:(.)?([<>=^]))?([+\-( ])?([$#])?(0)?(\d+)?(,)?(\.\d+)?(~)?([a-z%])?$/i;

function formatSpecifier(specifier) {
  if (!(match = re.exec(specifier))) throw new Error("invalid format: " + specifier);
  var match;
  return new FormatSpecifier({
    fill: match[1],
    align: match[2],
    sign: match[3],
    symbol: match[4],
    zero: match[5],
    width: match[6],
    comma: match[7],
    precision: match[8] && match[8].slice(1),
    trim: match[9],
    type: match[10]
  });
}

formatSpecifier.prototype = FormatSpecifier.prototype; // instanceof

function FormatSpecifier(specifier) {
  this.fill = specifier.fill === undefined ? " " : specifier.fill + "";
  this.align = specifier.align === undefined ? ">" : specifier.align + "";
  this.sign = specifier.sign === undefined ? "-" : specifier.sign + "";
  this.symbol = specifier.symbol === undefined ? "" : specifier.symbol + "";
  this.zero = !!specifier.zero;
  this.width = specifier.width === undefined ? undefined : +specifier.width;
  this.comma = !!specifier.comma;
  this.precision = specifier.precision === undefined ? undefined : +specifier.precision;
  this.trim = !!specifier.trim;
  this.type = specifier.type === undefined ? "" : specifier.type + "";
}

FormatSpecifier.prototype.toString = function() {
  return this.fill
      + this.align
      + this.sign
      + this.symbol
      + (this.zero ? "0" : "")
      + (this.width === undefined ? "" : Math.max(1, this.width | 0))
      + (this.comma ? "," : "")
      + (this.precision === undefined ? "" : "." + Math.max(0, this.precision | 0))
      + (this.trim ? "~" : "")
      + this.type;
};

// Trims insignificant zeros, e.g., replaces 1.2000k with 1.2k.
function formatTrim(s) {
  out: for (var n = s.length, i = 1, i0 = -1, i1; i < n; ++i) {
    switch (s[i]) {
      case ".": i0 = i1 = i; break;
      case "0": if (i0 === 0) i0 = i; i1 = i; break;
      default: if (i0 > 0) { if (!+s[i]) break out; i0 = 0; } break;
    }
  }
  return i0 > 0 ? s.slice(0, i0) + s.slice(i1 + 1) : s;
}

function get_exponent_from_prefix_order(prefix_order, grouping, exp_bases){
  let grouping_length = grouping.length;

  let val = Math.floor(prefix_order/grouping_length)*exp_bases[exp_bases.length-1] + exp_bases[prefix_order%grouping_length];
  return val
}

function get_appropriate_prefix_order(minimumPrefixOrder, maximumPrefixOrder, exp_value, grouping, exp_bases){
  let prefix_order = minimumPrefixOrder;
  for (let index = minimumPrefixOrder; index <= maximumPrefixOrder; index++) {
    const base = get_exponent_from_prefix_order(index, grouping, exp_bases);
    if (exp_value >= base){
      prefix_order = index;
      continue
    }
    break
  }
  return Math.max(minimumPrefixOrder, Math.min(maximumPrefixOrder, prefix_order))
}

function calculate_prefix_exponent(minimumPrefixOrder, maximumPrefixOrder, exp_value, grouping, exp_bases){
  let prefix_order = get_appropriate_prefix_order(minimumPrefixOrder, maximumPrefixOrder, exp_value, grouping, exp_bases);
  return get_exponent_from_prefix_order(prefix_order,grouping, exp_bases);
}

function calculate_exponent_bases(grouping){
  let exp_bases = [0];
	let base = 0;
	for (let index = 0; index < grouping.length; index++) {
		const item = grouping[index];
		base = base + item;
		exp_bases.push(base);
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

function createPrefixExponentAutoForLocale(minimumPrefixOrder, maximumPrefixOrder, grouping){
  let exp_bases = calculate_exponent_bases(grouping);
  
  return function calculateCurrencyPrefixAuto(exp_value) {
    return calculate_prefix_exponent(minimumPrefixOrder, maximumPrefixOrder, exp_value, grouping, exp_bases);
  }
}

function createPrefixOrderAutoForLocale(minimumPrefixOrder, maximumPrefixOrder, grouping){
  let exp_bases = calculate_exponent_bases(grouping);
  
  return function calculatePrefixOrderAuto(exp_value) {
    return get_appropriate_prefix_order(minimumPrefixOrder, maximumPrefixOrder, exp_value, grouping, exp_bases);
  }
}

function createFormatCurrencyPrefixAutoForLocale(currencyAbbreviations, grouping) {

	let calc_prefix_exp = createPrefixExponentAutoForLocale(0, currencyAbbreviations.length - 1,grouping);
  
  return function formatCurrencyPrefixAuto(x, p) {
    return formatSignificantDigitsForPrefixes(x, p, calc_prefix_exp);
  }
}

function formatPrefixAuto(x, p) {
	let calc_prefix_exp = createPrefixExponentAutoForLocale(-8, 8, [3]);
  return formatSignificantDigitsForPrefixes(x, p, calc_prefix_exp);
}

function formatRounded(x, p) {
  var d = formatDecimal(x, p);
  if (!d) return x + "";
  var coefficient = d[0],
      exponent = d[1];
  return exponent < 0 ? "0." + new Array(-exponent).join("0") + coefficient
      : coefficient.length > exponent + 1 ? coefficient.slice(0, exponent + 1) + "." + coefficient.slice(exponent + 1)
      : coefficient + new Array(exponent - coefficient.length + 2).join("0");
}

var formatTypes = {
  "%": function(x, p) { return (x * 100).toFixed(p); },
  "b": function(x) { return Math.round(x).toString(2); },
  "c": function(x) { return x + ""; },
  "d": function(x) { return Math.round(x).toString(10); },
  "e": function(x, p) { return x.toExponential(p); },
  "f": function(x, p) { return x.toFixed(p); },
  "g": function(x, p) { return x.toPrecision(p); },
  "K": createFormatCurrencyPrefixAutoForLocale, // depends of the current locale
  "o": function(x) { return Math.round(x).toString(8); },
  "p": function(x, p) { return formatRounded(x * 100, p); },
  "r": formatRounded,
  "s": formatPrefixAuto,
  "X": function(x) { return Math.round(x).toString(16).toUpperCase(); },
  "x": function(x) { return Math.round(x).toString(16); }
};

function identity(x) {
  return x;
}

var map = Array.prototype.map,
    SIprefixes = ["y","z","a","f","p","n","µ","m","","k","M","G","T","P","E","Z","Y"],
    defaultCurrencyAbbreviations = ["", "K", "M", "B", "T"];

function formatLocale(locale) {
  var group = locale.grouping === undefined || locale.thousands === undefined ? identity : formatGroup(map.call(locale.grouping, Number), locale.thousands + ""),
      currencyAbbreviations = locale.currencyAbbreviations === undefined ? defaultCurrencyAbbreviations : locale.currencyAbbreviations,
      currencyPrefix = locale.currency === undefined ? "" : locale.currency[0] + "",
      currencySuffix = locale.currency === undefined ? "" : locale.currency[1] + "",
      decimal = locale.decimal === undefined ? "." : locale.decimal + "",
      numerals = locale.numerals === undefined ? identity : formatNumerals(map.call(locale.numerals, String)),
      percent = locale.percent === undefined ? "%" : locale.percent + "",
      minus = locale.minus === undefined ? "-" : locale.minus + "",
      nan = locale.nan === undefined ? 'NaN' : locale.nan + '',
      grouping = locale.grouping === undefined ? [3] : locale.grouping;
  
  function newFormat(specifier) {
    specifier = formatSpecifier(specifier);

    var fill = specifier.fill,
        align = specifier.align,
        sign = specifier.sign,
        symbol = specifier.symbol,
        zero = specifier.zero,
        width = specifier.width,
        comma = specifier.comma,
        precision = specifier.precision,
        trim = specifier.trim,
        type = specifier.type;

    // The "n" type is an alias for ",g".
    if (type === "n") comma = true, type = "g";

    // The "" type, and any invalid type, is an alias for ".12~g".
    else if (!formatTypes[type]) precision === undefined && (precision = 12), trim = true, type = "g";

    // If zero fill is specified, padding goes after sign and before digits.
    if (zero || (fill === "0" && align === "=")) zero = true, fill = "0", align = "=";

    // Compute the prefix and suffix.
    // For SI-prefix, the suffix is lazily computed.
    var prefix = symbol === "$" ? currencyPrefix : symbol === "#" && /[boxX]/.test(type) ? "0" + type.toLowerCase() : "",
        suffix = symbol === "$" ? currencySuffix : /[%p]/.test(type) ? percent : "";

    // What format function should we use?
    // Is this an integer type?
    // Can this type generate exponential notation?
    var formatType = formatTypes[type],
        maybeSuffix = /[defgKprs%]/.test(type);

    if (type === 'K')
      formatType = formatType(currencyAbbreviations, grouping);

    let calc_prefix_exp;
    if (type === 's') calc_prefix_exp = createPrefixExponentAutoForLocale(-8, 8,grouping);
    else if (type === 'K') calc_prefix_exp = createPrefixExponentAutoForLocale(0, currencyAbbreviations.length - 1,grouping);

    let calc_prefix_order;
    if (type === 's') calc_prefix_order = createPrefixOrderAutoForLocale(-8, 8,grouping);
    else if (type === 'K') calc_prefix_order = createPrefixOrderAutoForLocale(0, currencyAbbreviations.length - 1,grouping);


    // Set the default precision if not specified,
    // or clamp the specified precision to the supported range.
    // For significant precision, it must be in [1, 21].
    // For fixed precision, it must be in [0, 20].
    // For financial type, default precision is 3 significant digits instead of 6.
    precision = precision === undefined ? (type === "K" ? 3 : 6)
        : /[gKprs]/.test(type) ? Math.max(1, Math.min(21, precision))
        : Math.max(0, Math.min(20, precision));

    function format(value) {
      var valuePrefix = prefix,
          valueSuffix = suffix,
          i, n, c;

      if (type === "c") {
        valueSuffix = formatType(value) + valueSuffix;
        value = "";
      } else {
        value = +value;

        // Perform the initial formatting.
        var valueNegative = value < 0;
        let orig_value = isNaN(value) ? nan : value;
        value = isNaN(value) ? nan : formatType(Math.abs(value), precision);

        // Trim insignificant zeros.
        if (trim) value = formatTrim(value);

        // If a negative value rounds to zero during formatting, treat as positive.
        if (valueNegative && +value === 0) valueNegative = false;

        // Compute the prefix and suffix.
        valuePrefix = (valueNegative ? (sign === "(" ? sign : minus) : sign === "-" || sign === "(" ? "" : sign) + valuePrefix;

        if(type === 's' || type === 'K'){
          let d = formatDecimal(Math.abs(orig_value), precision);
          let exponent = d[1];
          // console.log(type,exponent,calc_prefix_exp(exponent))

          if (type === 's') valueSuffix = SIprefixes[-1 * -8 + calc_prefix_order(calc_prefix_exp(exponent))] + valueSuffix;
          else if (type === 'K') valueSuffix = currencyAbbreviations[-1 * 0 + calc_prefix_order(calc_prefix_exp(exponent))] + valueSuffix;
        }

        valueSuffix = valueSuffix + (valueNegative && sign === "(" ? ")" : "");

        // Break the formatted value into the integer “value” part that can be
        // grouped, and fractional or exponential “suffix” part that is not.
        if (maybeSuffix) {
          i = -1, n = value.length;
          while (++i < n) {
            if (c = value.charCodeAt(i), 48 > c || c > 57) {
              valueSuffix = (c === 46 ? decimal + value.slice(i + 1) : value.slice(i)) + valueSuffix;
              value = value.slice(0, i);
              break;
            }
          }
        }
      }

      // If the fill character is not "0", grouping is applied before padding.
      if (comma && !zero) value = group(value, Infinity);

      // Compute the padding.
      var length = valuePrefix.length + value.length + valueSuffix.length,
          padding = length < width ? new Array(width - length + 1).join(fill) : "";

      // If the fill character is "0", grouping is applied after padding.
      if (comma && zero) value = group(padding + value, padding.length ? width - valueSuffix.length : Infinity), padding = "";

      // Reconstruct the final output based on the desired alignment.
      switch (align) {
        case "<": value = valuePrefix + value + valueSuffix + padding; break;
        case "=": value = valuePrefix + padding + value + valueSuffix; break;
        case "^": value = padding.slice(0, length = padding.length >> 1) + valuePrefix + value + valueSuffix + padding.slice(length); break;
        default: value = padding + valuePrefix + value + valueSuffix; break;
      }

      return numerals(value);
    }

    format.toString = function() {
      return specifier + "";
    };

    return format;
  }


  // function precise(x) {
  //   return Number.parseFloat(x).toPrecision(4);
  // }

  function createFormatPrefix(prefixes, minimumPrefixOrder, maximumPrefixOrder) {
    let calc_prefix_exp = createPrefixExponentAutoForLocale(minimumPrefixOrder, maximumPrefixOrder,grouping);
    let calc_prefix_order = createPrefixOrderAutoForLocale(minimumPrefixOrder, maximumPrefixOrder,grouping);

    return function(specifier, value) {
      var exp_value = exponent(value);
      let e, k, prefix, f;
      f = newFormat(((specifier = formatSpecifier(specifier)), (specifier.type = 'f'), specifier));

      e =	calc_prefix_exp(exp_value);
      k = Math.pow(10, -e);
      let prefix_order = calc_prefix_order(e);

      prefix = prefixes[-1 * minimumPrefixOrder + prefix_order];
      return function(value) {
        return f(k * value) + prefix;
      };
    };
  }
  var formatPrefix = createFormatPrefix(SIprefixes, -8, 8);
  var formatCurrencyPrefix = createFormatPrefix(currencyAbbreviations, 0, currencyAbbreviations.length - 1);

  return {
    format: newFormat,
    formatCurrencyPrefix: formatCurrencyPrefix,
    formatPrefix: formatPrefix
  };
}

var locale;

defaultLocale({
  decimal: ".",
  thousands: ",",
  grouping: [3],
  currency: ["$", ""],
  minus: "-"
});

function defaultLocale(definition) {
  locale = formatLocale(definition);
  exports.format = locale.format;
  exports.formatCurrencyPrefix = locale.formatCurrencyPrefix;
  exports.formatPrefix = locale.formatPrefix;
  return locale;
}

function precisionFixed(step) {
  return Math.max(0, -exponent(Math.abs(step)));
}

function precisionRound(step, max) {
  step = Math.abs(step), max = Math.abs(max) - step;
  return Math.max(0, exponent(max) - exponent(step)) + 1;
}

exports.FormatSpecifier = FormatSpecifier;
exports.currencyPrecisionPrefix = currencyPrecisionPrefix;
exports.formatDefaultLocale = defaultLocale;
exports.formatLocale = formatLocale;
exports.formatSpecifier = formatSpecifier;
exports.precisionFixed = precisionFixed;
exports.precisionPrefix = precisionPrefix;
exports.precisionRound = precisionRound;

Object.defineProperty(exports, '__esModule', { value: true });

})));
