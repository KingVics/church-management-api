const generateUniqueRef = () => {
  var min = 1000;
  var max = 9999;
  var transRef = Math.random() * (max - min) + min;
  transRef = Math.round(transRef);
  return transRef.toString();
};

module.exports = generateUniqueRef;
