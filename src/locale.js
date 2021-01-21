import exponent from "./exponent.js";
import formatGroup from "./formatGroup.js";
import formatNumerals from "./formatNumerals.js";
import formatSpecifier from "./formatSpecifier.js";
import formatTrim from "./formatTrim.js";
import formatTypes from "./formatTypes.js";
import { createPrefixOrderAutoForLocale, createPrefixExponentAutoForLocale } from './formatPrefixAuto.js';
import identity from './identity.js';
import formatDecimal from "./formatDecimal.js";

var map = Array.prototype.map,
    SIprefixes = ["y","z","a","f","p","n","µ","m","","k","M","G","T","P","E","Z","Y"],
    defaultCurrencyAbbreviations = ["", "K", "M", "B", "T"];

export default function(locale) {
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

    let calc_prefix_exp
    if (type === 's') calc_prefix_exp = createPrefixExponentAutoForLocale(-8, 8,grouping);
    else if (type === 'K') calc_prefix_exp = createPrefixExponentAutoForLocale(0, currencyAbbreviations.length - 1,grouping);

    let calc_prefix_order
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
          let exponent = d[1]
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
    let calc_prefix_exp = createPrefixExponentAutoForLocale(minimumPrefixOrder, maximumPrefixOrder,grouping)
    let calc_prefix_order = createPrefixOrderAutoForLocale(minimumPrefixOrder, maximumPrefixOrder,grouping);

    return function(specifier, value) {
      var exp_value = exponent(value);
      let e, k, prefix, f;
      f = newFormat(((specifier = formatSpecifier(specifier)), (specifier.type = 'f'), specifier));

      e =	calc_prefix_exp(exp_value);
      k = Math.pow(10, -e);
      let prefix_order = calc_prefix_order(e)

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
