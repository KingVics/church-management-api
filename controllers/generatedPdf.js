const PDFDocument = require('pdfkit');
const path = require('path');
const GeneratePdf = (req, res) => {
  const { testimony } = req.body;
  const data = testimony;

  // Create a PDF document
  const doc = new PDFDocument();
  let buffers = [];

  // Capture the PDF data in buffers
  doc.on('data', buffers.push.bind(buffers));
  doc.on('end', () => {
    const pdfData = Buffer.concat(buffers);

    // Send the PDF as a response
    res.writeHead(200, {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename=generated.pdf',
    });
    res.end(pdfData);
  });

  // Register a custom font
  const fontPath = path.join(
    __dirname,
    'font',
    'MontserratAlternates-SemiBold.otf'
  ); // Replace with your font file name
  doc.registerFont('Montserrat', fontPath);

  // Add a header (reusable function for all pages)
  const addHeader = (doc) => {
    doc
      .font('Montserrat') // Use the custom font
      .fontSize(18)
      .text(process.env.CHURCH_NAME + " Online Testimonies", {
        align: 'center', // Center align the header
      })
      .moveDown(0.5); // Add some space after the header
  };

  // Add the header
  addHeader(doc);

  // Add content to the PDF
  data.forEach((item, index) => {
    doc
      .font('Montserrat')
      .fontSize(16)
      .text(`Testimony ${index + 1}`, { underline: true });
    doc.text(`Name: ${item.name}`);
    doc.text(`Date: ${item.date}`);
    doc.text(`Phone: ${item.phone}`);
    doc.text(`Testimony: ${item.testimony}`, { align: 'justify' }),
      doc.moveDown();
  });

  doc.end();
};

module.exports = {
  GeneratePdf,
};
