const ExcelJS = require('exceljs');
const fs = require('fs');
const generateXLS = async ({
  data,
  type,
  activityId,
  sendReport,
  fileName,
}) => {
  try {
    const workbook = new ExcelJS.Workbook();

    if (!type) {
      // const names = ['Present Count', 'Absent Count'];

      // for (var i in names) {
      //   let Sheets = names[i];
      //   Sheets = workbook.addWorksheet(names[i], {
      //     pageSetup: { paperSize: 9, orientation: 'landscape' },
      //   });

      //   let rowIndex = 3;

      //   let row = Sheets.getRow(rowIndex);

      //   row.values = [
      //     'S/N',
      //     'Names of Member',
      //     'Phone Number',
      //     'Address',
      //     'Gender',
      //     'Category',
      //     'Time',
      //     'Service Name',
      //     'Date',
      //     'Attendance',
      //   ];

      //   row.font = { bold: true };

      //   const columnWidths = [30, 30, 30];

      //   row.eachCell((cell, colNumber) => {
      //     const columnIndex = colNumber - 1;
      //     const columnWidth = columnWidths[columnIndex];
      //     Sheets.getColumn(colNumber).width = columnWidth;
      //   });

      //   let presentDATA = [];
      //   let absentDATA = [];
      //   let totalFemaleAdult = 0;
      //   let totalMaleAdult = 0;
      //   let totalChildren = 0;
      //   let totalFemaleTeen = 0;
      //   let totalMaleTeen = 0;

      //   let totalFemaleAdultp = 0;
      //   let totalMaleAdultp = 0;
      //   let totalChildrenp = 0;
      //   let totalFemaleTeenp = 0;
      //   let totalMaleTeenp = 0;

      //   for (let i = 0; i < data.length; i++) {
      //     const findPresent = data[i].attendance.find(
      //       (c) => c.serviceId?.toString() === activityId?.toString()
      //     );
      //     const firstName = data[i].firstName;
      //     const lastName = data[i].lastName;
      //     const phone = data[i].phone || '';
      //     const gender = data[i].gender;
      //     const address = data[i].address || '';
      //     const category = data[i].category || '';
      //     const membershipType = data[i].membershipType;

      //     const record = {
      //       firstName,
      //       lastName,
      //       phone,
      //       gender,
      //       address,
      //       category,
      //       attendance: findPresent,
      //       membershipType,
      //     };
      //     if (
      //       data[i].attendance.find(
      //         (c) => c.serviceId?.toString() === activityId?.toString()
      //       )
      //     ) {
      //       if (findPresent?.attendance === 'Present') {
      //         presentDATA = [...presentDATA, record];
      //       } else {
      //         absentDATA = [...absentDATA, record];
      //       }
      //     }
      //   }

      //   console.log(presentDATA);
      // }

      const worksheetPresent = workbook.addWorksheet(`Present count `, {
        pageSetup: { paperSize: 9, orientation: 'landscape' },
      });
      const workSheetAbsent = workbook.addWorksheet(`Absent count `, {
        pageSetup: { paperSize: 9, orientation: 'landscape' },
      });

      let rowIndex = 3;

      let row = worksheetPresent.getRow(rowIndex);
      let row2 = workSheetAbsent.getRow(rowIndex);

      row.values = [
        'S/N',
        'Names of Member',
        'Phone Number',
        'Address',
        'Gender',
        'Category',
        'Time',
        'Service Name',
        'Date',
        'Attendance',
      ];
      row2.values = [
        'S/N',
        'Names of Member',
        'Phone Number',
        'Address',
        'Gender',
        'Category',
        'Time',
        'Service Name',
        'Date',
        'Attendance',
      ];
      row.font = { bold: true };
      row2.font = { bold: true };

      const columnWidths = [30, 30, 30];

      row.eachCell((cell, colNumber) => {
        const columnIndex = colNumber - 1;
        const columnWidth = columnWidths[columnIndex];
        worksheetPresent.getColumn(colNumber).width = columnWidth;
      });
      row2.eachCell((cell, colNumber) => {
        const columnIndex = colNumber - 1;
        const columnWidth = columnWidths[columnIndex];
        workSheetAbsent.getColumn(colNumber).width = columnWidth;
      });
      let presentDATA = [];
      let absentDATA = [];
      let totalFemaleAdult = 0;
      let totalMaleAdult = 0;
      let totalChildren = 0;
      let totalFemaleTeen = 0;
      let totalMaleTeen = 0;

      let totalFemaleAdultp = 0;
      let totalMaleAdultp = 0;
      let totalChildrenp = 0;
      let totalFemaleTeenp = 0;
      let totalMaleTeenp = 0;
      for (let i = 0; i < data.length; i++) {
        const findPresent = data[i].attendance.find(
          (c) => c.serviceId?.toString() === activityId?.toString()
        );
        const firstName = data[i].firstName;
        const lastName = data[i].lastName;
        const phone = data[i].phone || '';
        const gender = data[i].gender;
        const address = data[i].address || '';
        const category = data[i].category || '';
        const membershipType = data[i].membershipType;

        const record = {
          firstName,
          lastName,
          phone,
          gender,
          address,
          category,
          attendance: findPresent,
          membershipType,
        };
        if (
          data[i].attendance.find(
            (c) => c.serviceId?.toString() === activityId?.toString()
          )
        ) {
          if (findPresent?.attendance === 'Present') {
            presentDATA = [...presentDATA, record];
          } else {
            absentDATA = [...absentDATA, record];
          }
        }
      }

      presentDATA.forEach((item, index) => {
        let presentname = '';
        let presentphone = '';
        let presentgender = '';
        let presentaddress = '';
        let time = '';
        let serviceName = '';
        let attendance = '';
        let category = '';

        if (item.category === 'Adult' && item.gender === 'Female') {
          totalFemaleAdult += 1;
        } else if (item.category === 'Adult' && item.gender === 'Male') {
          totalMaleAdult += 1;
        } else if (item.category === 'Teen' && item.gender === 'Male') {
          totalMaleTeen += 1;
        } else if (item.category === 'Teen' && item.gender === 'Female') {
          totalFemaleTeen += 1;
        } else {
          totalChildren += 1;
        }

        presentname = `${item.firstName} ${item.lastName}`;
        presentphone = item.phone;
        presentgender = item.gender;
        presentaddress = item.address;
        time = item.attendance.time || '';
        serviceName = item.attendance.serviceName;
        attendance = item.attendance.attendance;
        category = item.category;
        const row = worksheetPresent.getRow(rowIndex + index + 1);
        row.getCell('A').value = index + 1;
        row.getCell('B').value = presentname;
        row.getCell('C').value = presentphone;
        row.getCell('D').value = presentaddress;
        row.getCell('E').value = presentgender;
        row.getCell('F').value = category;
        row.getCell('G').value = time;
        row.getCell('H').value = serviceName;
        row.getCell('I').value = item.attendance.date;
        row.getCell('J').value = attendance;
        row.getCell('B').alignment = { wrapText: true };
      });

      absentDATA.forEach((item, index) => {
        let presentname = '';
        let presentphone = '';
        let presentgender = '';
        let presentaddress = '';
        let serviceName = '';
        let category;

        if (item.category === 'Adult' && item.gender === 'Female') {
          totalFemaleAdultp += 1;
        } else if (item.category === 'Adult' && item.gender === 'Male') {
          totalMaleAdultp += 1;
        } else if (item.category === 'Teen' && item.gender === 'Male') {
          totalMaleTeenp += 1;
        } else if (item.category === 'Teen' && item.gender === 'Female') {
          totalFemaleTeenp += 1;
        } else {
          totalChildrenp += 1;
        }

        presentname = `${item.firstName} ${item.lastName}`;
        presentphone = item.phone;
        presentgender = item.gender;
        presentaddress = item.address;
        time = item.attendance.time || '';
        serviceName = item.attendance.serviceName;
        attendance = item.attendance.attendance;
        category = item.category;
        const row = workSheetAbsent.getRow(rowIndex + index + 1);
        row.getCell('A').value = index + 1;
        row.getCell('B').value = presentname;
        row.getCell('C').value = presentphone;
        row.getCell('D').value = presentaddress;
        row.getCell('E').value = presentgender;
        row.getCell('F').value = category;
        row.getCell('G').value = '';
        row.getCell('H').value = serviceName;
        row.getCell('I').value = item.attendance.date;
        row.getCell('J').value = 'Absent';
        row.getCell('B').alignment = { wrapText: true };
      });

      const endRow = worksheetPresent.lastRow._number + 1;
      const endRowAbsent = workSheetAbsent.lastRow._number + 1;
      rowIndex += data.length;

      worksheetPresent.getCell(`A${endRow + 2}`).value = 'Female Total';
      worksheetPresent.getCell(`B${endRow + 2}`).value = totalFemaleAdult;
      worksheetPresent.getCell(`A${endRow + 3}`).value = 'Male Total';
      worksheetPresent.getCell(`B${endRow + 3}`).value = totalMaleAdult;
      worksheetPresent.getCell(`A${endRow + 4}`).value =
        'Female Teengers Total';
      worksheetPresent.getCell(`B${endRow + 4}`).value = totalFemaleTeen;
      worksheetPresent.getCell(`A${endRow + 5}`).value = 'Male Teengers Total';
      worksheetPresent.getCell(`B${endRow + 5}`).value = totalMaleTeen;
      worksheetPresent.getCell(`A${endRow + 6}`).value = 'Children';
      worksheetPresent.getCell(`B${endRow + 6}`).value = totalChildren;
      worksheetPresent.getCell(`A${endRow + 7}`).value = 'TOTAL';
      worksheetPresent.getCell(`B${endRow + 7}`).value =
        totalChildren +
        totalFemaleAdult +
        totalFemaleTeen +
        totalMaleAdult +
        totalMaleTeen;

      workSheetAbsent.getCell(`A${endRowAbsent + 3}`).value = 'Female Total';
      workSheetAbsent.getCell(`B${endRowAbsent + 3}`).value = totalFemaleAdultp;
      workSheetAbsent.getCell(`A${endRowAbsent + 4}`).value = 'Male Total';
      workSheetAbsent.getCell(`B${endRowAbsent + 4}`).value = totalMaleAdultp;
      workSheetAbsent.getCell(`A${endRowAbsent + 5}`).value =
        'Female Teengers Total';
      workSheetAbsent.getCell(`B${endRowAbsent + 5}`).value = totalFemaleTeenp;
      workSheetAbsent.getCell(`A${endRowAbsent + 6}`).value =
        'Male Teengers Total';
      workSheetAbsent.getCell(`B${endRowAbsent + 6}`).value = totalMaleTeenp;
      workSheetAbsent.getCell(`A${endRowAbsent + 7}`).value = 'Children';
      workSheetAbsent.getCell(`B${endRowAbsent + 7}`).value = totalChildrenp;
      workSheetAbsent.getCell(`A${endRowAbsent + 8}`).value = 'TOTAL';
      workSheetAbsent.getCell(`B${endRowAbsent + 8}`).value =
        totalChildrenp +
        totalFemaleAdultp +
        totalFemaleTeenp +
        totalMaleAdultp +
        totalMaleTeenp;
      // // Merge cells for the logo
      // // worksheetPresent.mergeCells(
      // //   `A1:${String.fromCharCode(65 + worksheetPresent.columns.length - 1)}1`
      // // );

      // workSheetAbsent.getRow(1).height = 40;

      // Define the border style
      const borderStyle = {
        style: 'thin', // You can use 'thin', 'medium', 'thick', or other valid styles
        color: { argb: '00000000' },
      };

      // Loop through all cells and apply the border style
      workSheetAbsent.eachRow((row, rowNumber) => {
        row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
          cell.border = {
            top: borderStyle,
            bottom: borderStyle,
          };
        });
      });

      // Loop through all cells and apply the border style
      worksheetPresent.eachRow((row, rowNumber) => {
        row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
          cell.border = {
            top: borderStyle,
            bottom: borderStyle,
          };
        });
      });

      // Generate the XLS file and save excel file
      if (sendReport) {
        var dir = './report';
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        await workbook.xlsx
          .writeFile(`${dir}/${fileName}.xlsx`)
          .then(() => console.log('File saved!'));
        return 'File saved!';
      } else {
        return workbook.xlsx.writeBuffer();
      }
    } else {
      const worksheet = workbook.addWorksheet(`List of ${type} count `, {
        pageSetup: { paperSize: 9, orientation: 'landscape' },
      });

      let rowIndex = 3;

      let row = worksheet.getRow(rowIndex);

      const columnWidths = [30, 30, 30];

      row.eachCell((cell, colNumber) => {
        const columnIndex = colNumber - 1;
        const columnWidth = columnWidths[columnIndex];
        worksheetPresent.getColumn(colNumber).width = columnWidth;
      });

      row.values = [
        'S/N',
        'Names of Member',
        'Phone Number',
        'Address',
        'Gender',
        'Category',
        'Time',
        'Service Name',
        'Date',
        'Attendance',
      ];
      let presentDATA = [];
      for (let i = 0; i < data.length; i++) {
        const findPresent = data[i].attendance.find(
          (c) => c.serviceId?.toString() === activityId?.toString()
        );
        const firstName = data[i].firstName;
        const lastName = data[i].lastName;
        const phone = data[i].phone || '';
        const gender = data[i].gender;
        const address = data[i].address || '';
        const category = data[i].category || '';
        if (
          data[i].attendance.find(
            (c) => c.serviceId?.toString() === activityId?.toString()
          )
        ) {
          if (findPresent?.attendance === 'Present') {
            const record = {
              firstName,
              lastName,
              phone,
              gender,
              address,
              category,
              attendance: findPresent,
            };

            presentDATA = [...presentDATA, record];
          }
        }
      }

      presentDATA.forEach((item, index) => {
        let presentname = '';
        let presentphone = '';
        let presentgender = '';
        let presentaddress = '';
        let time = '';
        let serviceName = '';
        let attendance = '';
        let category = '';

        presentname = `${item.firstName} ${item.lastName}`;
        presentphone = item.phone;
        presentgender = item.gender;
        presentaddress = item.address;
        time = item.attendance.time || '';
        serviceName = item.attendance.serviceName;
        attendance = item.attendance.attendance;
        category = item.category;
        const row = worksheet.getRow(rowIndex + index + 1);
        row.getCell('A').value = index + 1;
        row.getCell('B').value = presentname;
        row.getCell('C').value = presentphone;
        row.getCell('D').value = presentaddress;
        row.getCell('E').value = presentgender;
        row.getCell('F').value = category;
        row.getCell('G').value = time;
        row.getCell('H').value = serviceName;
        row.getCell('I').value = item.attendance.date;
        row.getCell('J').value = attendance;
        row.getCell('B').alignment = { wrapText: true };
      });

      // Define the border style
      const borderStyle = {
        style: 'thin', // You can use 'thin', 'medium', 'thick', or other valid styles
        color: { argb: '00000000' },
      };

      // Loop through all cells and apply the border style
      worksheet.eachRow((row, rowNumber) => {
        row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
          cell.border = {
            top: borderStyle,
            bottom: borderStyle,
          };
        });
      });
      return workbook.xlsx.writeBuffer();
    }
  } catch (error) {
    console.log(error);
  }
};

module.exports = generateXLS;
