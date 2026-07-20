import React from 'react';
import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer';
import dayjs from 'dayjs';

const BORDER = '#999999';

const styles = StyleSheet.create({
  page: { padding: 24, fontSize: 9, fontFamily: 'Helvetica', color: '#222222' },

  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  companyBlock: { maxWidth: '55%' },
  companyName: { fontSize: 16, fontFamily: 'Helvetica-Bold', marginBottom: 2 },
  companySub: { fontSize: 8, color: '#555555' },

  headerRight: { alignItems: 'flex-end' },
  quotationTitle: { fontSize: 18, fontFamily: 'Helvetica-Bold', marginBottom: 6 },

  infoTable: { borderWidth: 1, borderColor: BORDER, minWidth: 240 },
  infoRow: { flexDirection: 'row', borderBottomWidth: 1, borderColor: BORDER },
  infoRowLast: { flexDirection: 'row' },
  infoLabelCell: { width: 110, backgroundColor: '#eeeeee', padding: 3, fontFamily: 'Helvetica-Bold', borderRightWidth: 1, borderColor: BORDER },
  infoValueCell: { flex: 1, padding: 3 },

  contactBox: { borderWidth: 1, borderColor: BORDER, padding: 6, marginBottom: 10 },
  boxTitle: { fontFamily: 'Helvetica-Bold', marginBottom: 3 },

  twoColSection: { flexDirection: 'row', borderWidth: 1, borderColor: BORDER, marginBottom: 10 },
  twoColBox: { flex: 1, padding: 6 },
  twoColBoxBorder: { borderRightWidth: 1, borderColor: BORDER },
  twoColHeader: { flexDirection: 'row', backgroundColor: '#eeeeee', borderBottomWidth: 1, borderColor: BORDER },
  twoColHeaderCell: { flex: 1, padding: 3, fontFamily: 'Helvetica-Bold' },
  twoColHeaderCellBorder: { borderRightWidth: 1, borderColor: BORDER },

  routeRow: { flexDirection: 'row', borderWidth: 1, borderColor: BORDER, marginBottom: 10 },
  routeCell: { padding: 4, borderRightWidth: 1, borderColor: BORDER },
  routeLabel: { fontFamily: 'Helvetica-Bold', marginRight: 3 },
  routeCellFlex: { flex: 1, flexDirection: 'row', alignItems: 'center' },

  sectionHeader: { backgroundColor: '#dddddd', padding: 3, fontFamily: 'Helvetica-Bold', borderWidth: 1, borderColor: BORDER, borderBottomWidth: 0 },

  table: { borderWidth: 1, borderColor: BORDER, marginBottom: 10 },
  tableHeaderRow: { flexDirection: 'row', backgroundColor: '#333333' },
  tableHeaderCell: { color: '#ffffff', padding: 3, fontFamily: 'Helvetica-Bold', fontSize: 8 },
  tableRow: { flexDirection: 'row', borderTopWidth: 1, borderColor: BORDER },
  tableCell: { padding: 3, fontSize: 8 },

  totalRow: { flexDirection: 'row', borderTopWidth: 1, borderColor: BORDER, backgroundColor: '#eeeeee' },
  totalLabelCell: { padding: 4, fontFamily: 'Helvetica-Bold', textAlign: 'right' },
  totalValueCell: { padding: 4, fontFamily: 'Helvetica-Bold' },

  notesBox: { borderWidth: 1, borderColor: BORDER, padding: 6, marginBottom: 24, minHeight: 40 },

  signatureLine: { marginTop: 20, borderTopWidth: 1, borderColor: '#222222', width: 220, paddingTop: 3 },

  footer: { position: 'absolute', bottom: 16, left: 24, right: 24, fontSize: 7, color: '#888888', textAlign: 'center' },
});

function fmtDate(d) {
  return d ? dayjs(d).format('MMM/DD/YYYY hh:mm A') : '';
}

function money(n) {
  const v = Number(n) || 0;
  return v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function QuotationPdfDocument({ quotation, agencia }) {
  const q = quotation || {};
  const cargoItems = q.cargoItems || [];
  const charges = q.charges || [];
  const total = charges.reduce((acc, c) => acc + (Number(c.quantity) || 0) * (Number(c.price) || 0), 0);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Letterhead + quotation number/date box */}
        <View style={styles.headerRow}>
          <View style={styles.companyBlock}>
            <Text style={styles.companyName}>{agencia?.agenciaName || ''}</Text>
            {agencia?.agenciaDireccion ? <Text style={styles.companySub}>{agencia.agenciaDireccion}</Text> : null}
            {agencia?.agenciaTelefono ? <Text style={styles.companySub}>Tel: {agencia.agenciaTelefono}</Text> : null}
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.quotationTitle}>Quotation</Text>
            <View style={styles.infoTable}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabelCell}>Quotation Number:</Text>
                <Text style={styles.infoValueCell}>{q.quotationNumber}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabelCell}>Date/Time:</Text>
                <Text style={styles.infoValueCell}>{fmtDate(q.quotationDate)}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabelCell}>Expiration Date:</Text>
                <Text style={styles.infoValueCell}>{fmtDate(q.expirationDate)}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabelCell}>Employee:</Text>
                <Text style={styles.infoValueCell}>{q.employee}</Text>
              </View>
              <View style={styles.infoRowLast}>
                <Text style={styles.infoLabelCell}>Payment Terms:</Text>
                <Text style={styles.infoValueCell}>{q.paymentTerms}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Contact Info */}
        <View style={styles.contactBox}>
          <Text style={styles.boxTitle}>Contact Info: {q.contactName}</Text>
          {q.contactAddress ? <Text>{q.contactAddress}</Text> : null}
          {(q.contactCity || q.contactCountry) ? <Text>{[q.contactCity, q.contactCountry].filter(Boolean).join(', ')}</Text> : null}
          {q.contactPhone ? <Text>Tel: {q.contactPhone}</Text> : null}
        </View>

        {/* Origin / Destination */}
        <View>
          <View style={styles.twoColHeader}>
            <Text style={[styles.twoColHeaderCell, styles.twoColHeaderCellBorder]}>Origin:</Text>
            <Text style={styles.twoColHeaderCell}>Destination:</Text>
          </View>
          <View style={styles.twoColSection}>
            <View style={[styles.twoColBox, styles.twoColBoxBorder]}>
              <Text>{q.originCompanyName}</Text>
              {q.originAddress ? <Text>{q.originAddress}</Text> : null}
              {(q.originCity || q.originCountry) ? <Text>{[q.originCity, q.originCountry].filter(Boolean).join(', ')}</Text> : null}
              {q.originPhone ? <Text>Tel: {q.originPhone}</Text> : null}
            </View>
            <View style={styles.twoColBox}>
              <Text>{q.destinationCompanyName}</Text>
              {q.destinationAddress ? <Text>{q.destinationAddress}</Text> : null}
              {(q.destinationCity || q.destinationCountry) ? <Text>{[q.destinationCity, q.destinationCountry].filter(Boolean).join(', ')}</Text> : null}
            </View>
          </View>
        </View>

        {/* Type of Move / Route */}
        <View style={styles.routeRow}>
          <View style={styles.routeCell}>
            <View style={styles.routeCellFlex}>
              <Text style={styles.routeLabel}>Type of Move:</Text>
              <Text>{q.typeOfMove}</Text>
            </View>
          </View>
          <View style={styles.routeCell}>
            <View style={styles.routeCellFlex}>
              <Text style={styles.routeLabel}>Origin:</Text>
              <Text>{q.routeOrigin}</Text>
            </View>
          </View>
          <View style={[styles.routeCell, { borderRightWidth: 0 }]}>
            <View style={styles.routeCellFlex}>
              <Text style={styles.routeLabel}>Destination:</Text>
              <Text>{q.routeDestination}</Text>
            </View>
          </View>
        </View>

        {/* Cargo Information */}
        <Text style={styles.sectionHeader}>Cargo Information</Text>
        <View style={styles.table}>
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.tableHeaderCell, { width: '10%' }]}>Pieces</Text>
            <Text style={[styles.tableHeaderCell, { width: '40%' }]}>Description</Text>
            <Text style={[styles.tableHeaderCell, { width: '20%' }]}>Weight</Text>
            <Text style={[styles.tableHeaderCell, { width: '30%' }]}>Volume</Text>
          </View>
          {cargoItems.length === 0 ? (
            <View style={styles.tableRow}>
              <Text style={[styles.tableCell, { width: '100%', textAlign: 'center', color: '#888888' }]}> </Text>
            </View>
          ) : cargoItems.map((c, i) => (
            <View style={styles.tableRow} key={i}>
              <Text style={[styles.tableCell, { width: '10%' }]}>{c.pieces}</Text>
              <Text style={[styles.tableCell, { width: '40%' }]}>{c.description}</Text>
              <View style={[styles.tableCell, { width: '20%' }]}>
                <Text>{money(c.weightKg)} Kg</Text>
                <Text>{money(c.weightLb)} lb</Text>
              </View>
              <View style={[styles.tableCell, { width: '30%' }]}>
                <Text>{money(c.volumeM3)} m³</Text>
                <Text>{money(c.volumeFt3)} ft³</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Description of Charges */}
        <Text style={styles.sectionHeader}>Description of Charges</Text>
        <View style={styles.table}>
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.tableHeaderCell, { width: '50%' }]}>Description</Text>
            <Text style={[styles.tableHeaderCell, { width: '15%', textAlign: 'right' }]}>Quantity</Text>
            <Text style={[styles.tableHeaderCell, { width: '15%', textAlign: 'right' }]}>Price</Text>
            <Text style={[styles.tableHeaderCell, { width: '20%', textAlign: 'right' }]}>Amount</Text>
          </View>
          {charges.map((c, i) => (
            <View style={styles.tableRow} key={i}>
              <Text style={[styles.tableCell, { width: '50%' }]}>{c.description}</Text>
              <Text style={[styles.tableCell, { width: '15%', textAlign: 'right' }]}>{money(c.quantity)}</Text>
              <Text style={[styles.tableCell, { width: '15%', textAlign: 'right' }]}>{money(c.price)}</Text>
              <Text style={[styles.tableCell, { width: '20%', textAlign: 'right' }]}>{money((Number(c.quantity) || 0) * (Number(c.price) || 0))}</Text>
            </View>
          ))}
          <View style={styles.totalRow}>
            <Text style={[styles.totalLabelCell, { width: '80%' }]}>Total {q.currency || 'USD'}</Text>
            <Text style={[styles.totalValueCell, { width: '20%', textAlign: 'right' }]}>{money(total)}</Text>
          </View>
        </View>

        {/* Notes */}
        <Text style={styles.sectionHeader}>Notes</Text>
        <View style={styles.notesBox}>
          <Text>{q.notes}</Text>
        </View>

        <View style={styles.signatureLine}>
          <Text>Signature</Text>
        </View>

        <Text style={styles.footer} fixed>
          {agencia?.agenciaName || ''}
        </Text>
      </Page>
    </Document>
  );
}
