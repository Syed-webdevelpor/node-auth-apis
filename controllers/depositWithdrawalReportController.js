const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');
const { DateTime } = require('luxon');
const ExcelJS = require('exceljs');
const AWS = require('aws-sdk');

require('dotenv').config();

const DB = require('../dbConnection.js');
const { verifyToken } = require('../tokenHandler.js');

const {
  S3_SYMBOL_BUCKET_NAME,
  S3_AWS_REGION,
  S3_AWS_ACCESS_KEY_ID,
  S3_AWS_SECRET_ACCESS_KEY,
  SIGNED_URL_EXPIRATION,
} = process.env;

const s3 = new AWS.S3({
  accessKeyId: S3_AWS_ACCESS_KEY_ID,
  secretAccessKey: S3_AWS_SECRET_ACCESS_KEY,
  region: S3_AWS_REGION,
  signatureVersion: 'v4',
});

function formatHeader(label) {
  // Ensure column names do not contain underscores/camelCase.
  // Input labels in our code are already human readable.
  return label
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildReportHeading() {
  return 'Deposit and Withdrawal Report';
}


function getColumnDefinitions() {
  // Use DB field names for mapping but display human readable headers.
  return [
    { key: 'transaction_id', header: 'Transaction Id' },
    { key: 'transaction_type', header: 'Transaction Type' },
    { key: 'status', header: 'Status' },
    { key: 'amount', header: 'Amount' },
    { key: 'created_at', header: 'Created At' },
  ].map((c) => ({ ...c, header: formatHeader(c.header) }));
}

async function fetchTransactionsForUser(userId, { status = 'success' } = {}) {
  // Using transaction_details table (present in db.sql)
  const sql = `
    SELECT
      transaction_id,
      user_id,
      amount,
      transaction_type,
      status,
      created_at
    FROM transaction_details
    WHERE user_id = ?
      AND transaction_type IN ('Deposit','Withdrawal')
      AND (? IS NULL OR status = ?)
    ORDER BY created_at DESC
  `;

  const [rows] = await DB.execute(sql, [userId, status, status]);
  return rows || [];
}

function toRowData(tx) {
  const dt = tx.created_at ? DateTime.fromJSDate(new Date(tx.created_at)) : null;
  return {
    transaction_id: tx.transaction_id,
    transaction_type: tx.transaction_type,
    status: tx.status,
    amount: tx.amount != null ? Number(tx.amount).toFixed(2) : '',
    created_at: dt ? dt.toFormat('yyyy-LL-dd HH:mm:ss') : '',
  };
}

async function uploadToS3AndGetSignedUrl({ buffer, contentType, fileName }) {
  const bucket = S3_SYMBOL_BUCKET_NAME;
  if (!bucket) throw new Error('Missing S3_SYMBOL_BUCKET_NAME');
  if (!SIGNED_URL_EXPIRATION) throw new Error('Missing SIGNED_URL_EXPIRATION');

  const key = `deposit-withdrawal-reports/${encodeURIComponent(fileName)}-${Date.now()}`;

  await s3
    .putObject({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      ACL: 'private',
    })
    .promise();

  const signedUrl = s3.getSignedUrl('getObject', {
    Bucket: bucket,
    Key: key,
    Expires: Number(SIGNED_URL_EXPIRATION) || 3600,
  });

  return signedUrl;
}

async function exportPdf(req, res) {
  const { verifyToken } = require('../tokenHandler.js');

  const caller = verifyToken(req.headers.access_token, true);
  if (caller && caller.status) return res.status(caller.status).json(caller);
  const userId = caller?.id?.toString();

  if (!userId) return res.status(401).json({ status: 401, message: 'Unauthorized' });

  const statusFilter = 'success';
  const transactions = await fetchTransactionsForUser(userId, { status: statusFilter });

  const columns = getColumnDefinitions();
  const heading = buildReportHeading();

  const pdfDoc = await PDFDocument.create();
  // Landscape A4
  const page = pdfDoc.addPage([841.89, 595.28]);

  const { width, height } = page.getSize();

  const { width, height } = page.getSize();
  const margin = 40;
  let y = height - margin;

  // Heading
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const headingWidth = font.widthOfTextAtSize(heading, 18);
  const headingX = (width - headingWidth) / 2;
  page.drawText(heading, { x: headingX, y, size: 18, font, color: rgb(0, 0.1, 0.3) });

  y -= 24;

  const sub = `User Id: ${userId} | Records: ${transactions.length} | Status: ${statusFilter}`;
  page.drawText(sub, { x: margin, y, size: 10, font: fontRegular, color: rgb(0, 0, 0) });
  y -= 18;

  // Table layout
  const tableWidth = width - margin * 2;
  const rowHeight = 18;
  const headerHeight = 20;

  const colCount = columns.length;
  const colWidth = tableWidth / colCount;

  // Header background
  for (let i = 0; i < colCount; i++) {
    const x = margin + i * colWidth;
    page.drawRectangle({ x, y: y - headerHeight + 4, width: colWidth, height: headerHeight, color: rgb(0.9, 0.9, 0.95) });
    page.drawText(columns[i].header, { x: x + 4, y: y + 6, size: 10, font: fontBoldFallback(fontRegular, pdfDoc) });
  }
  y -= headerHeight;

  // Rows
  const fontForHeaders = font;
  const maxRowsPerPage = 35;

  let rowIndex = 0;
  for (const tx of transactions) {
    if (rowIndex > 0 && rowIndex % maxRowsPerPage === 0) {
      // new page (landscape)
      pdfDoc.addPage([841.89, 595.28]);
      y = height - margin;

      // redraw table header on the new page (bold)
      for (let i = 0; i < colCount; i++) {
        const x = margin + i * colWidth;
        pdfDoc.getPages()[pdfDoc.getPages().length - 1].drawRectangle({

          x,
          y: y - headerHeight + 4,
          width: colWidth,
          height: headerHeight,
          color: rgb(0.9, 0.9, 0.95),
        });
        pdfDoc.getPages()[pdfDoc.getPages().length - 1].drawText(columns[i].header, {
          x: x + 4,
          y: y + 6,
          size: 10,
          font: fontRegular,
        });
      }

      y -= headerHeight;
    }


    for (let i = 0; i < colCount; i++) {
      const col = columns[i];
      const x = margin + i * colWidth;
      const value = String(toRowData(tx)[col.key] ?? '');

      // Truncate to fit
      const display = value.length > 18 ? value.slice(0, 17) + '…' : value;

      // cell border
      page.drawRectangle({
        x,
        y: y - rowHeight + 4,
        width: colWidth,
        height: rowHeight,
        borderColor: rgb(0.8, 0.8, 0.85),
        borderWidth: 0.5,
        color: rgb(1, 1, 1),
      });

      page.drawText(display, { x: x + 4, y: y + 6, size: 9, font: fontRegular, color: rgb(0, 0, 0) });
    }

    y -= rowHeight;
    rowIndex++;
  }

  const pdfBytes = await pdfDoc.save();
  const fileName = `deposit_withdrawal_report_${userId}.pdf`;

  const signedUrl = await uploadToS3AndGetSignedUrl({
    buffer: Buffer.from(pdfBytes),
    contentType: 'application/pdf',
    fileName,
  });

  return res.status(200).json({
    status: 200,
    message: 'PDF report generated',
    signedUrl,
    expiresIn: Number(SIGNED_URL_EXPIRATION) || 3600,
  });
}

function fontBoldFallback(fontRegular) {
  // Keep compatibility; headers use bold font in pdf-lib anyway.
  return fontRegular;
}

async function exportExcel(req, res) {
  const caller = verifyToken(req.headers.access_token, true);
  if (caller && caller.status) return res.status(caller.status).json(caller);
  const userId = caller?.id?.toString();
  if (!userId) return res.status(401).json({ status: 401, message: 'Unauthorized' });

  const statusFilter = 'success';
  const transactions = await fetchTransactionsForUser(userId, { status: statusFilter });

  const columns = getColumnDefinitions();

  const workbook = new ExcelJS.Workbook();

  const sheet = workbook.addWorksheet('DepositWithdrawal');

  // Heading
  sheet.mergeCells('A1:E1');
  sheet.getCell('A1').value = buildReportHeading();
  sheet.getCell('A1').font = { size: 16, bold: true };

  sheet.getCell('A2').value = `User Id: ${userId}`;
  sheet.getCell('A3').value = `Records: ${transactions.length}`;
  sheet.getCell('A4').value = `Status: ${statusFilter}`;

  const headerRowNumber = 6;
  const headerRow = sheet.getRow(headerRowNumber);

  columns.forEach((c, idx) => {
    const colLetter = String.fromCharCode('A'.charCodeAt(0) + idx);
    sheet.getCell(`${colLetter}${headerRowNumber}`).value = c.header;
    sheet.getCell(`${colLetter}${headerRowNumber}`).font = { bold: true };
    sheet.getCell(`${colLetter}${headerRowNumber}`).alignment = { vertical: 'middle', wrapText: true };
  });

  sheet.getRow(headerRowNumber).height = 22;

  // Data
  let rowNum = headerRowNumber + 1;
  for (const tx of transactions) {
    const rowData = toRowData(tx);
    columns.forEach((c, idx) => {
      const colLetter = String.fromCharCode('A'.charCodeAt(0) + idx);
      sheet.getCell(`${colLetter}${rowNum}`).value = rowData[c.key];
      sheet.getCell(`${colLetter}${rowNum}`).alignment = { vertical: 'middle' };
    });
    rowNum++;
  }

  // Column widths
  columns.forEach((c, idx) => {
    const colLetter = String.fromCharCode('A'.charCodeAt(0) + idx);
    sheet.getColumn(colLetter).width = Math.max(14, c.header.length + 2);
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const fileName = `deposit_withdrawal_report_${userId}.xlsx`;

  const signedUrl = await uploadToS3AndGetSignedUrl({
    buffer: Buffer.from(buffer),
    contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    fileName,
  });

  return res.status(200).json({
    status: 200,
    message: 'Excel report generated',
    signedUrl,
    expiresIn: Number(SIGNED_URL_EXPIRATION) || 3600,
  });
}

module.exports = {
  exportPdf,
  exportExcel,
};

