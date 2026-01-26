function toTitleCase(str) {
    if (str) {
      let string = str.replace(/\s+/g, ' ').trim();
      return string.replace(/\w\S*/g, function (txt) {
        const result = txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
  
        return result;
      });
    } else {
      return '';
    }
  }
  
  module.exports = toTitleCase;
  