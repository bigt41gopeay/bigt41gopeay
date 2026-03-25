import jsPDF from 'jspdf'
import { lt } from './helpers'

export function generateInvoicePDF(invoice, contact) {
  const doc = new jsPDF()
  const w = doc.internal.pageSize.getWidth()

  // Header bar
  doc.setFillColor(99, 102, 241)
  doc.rect(0, 0, w, 42, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(20)
  doc.setTextColor(255, 255, 255)
  doc.text('SASKAITA FAKTURA', 14, 18)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  doc.text(`Nr. ${lt(invoice.number)}`, 14, 30)
  doc.text(`Data: ${invoice.date}`, w - 14, 30, { align: 'right' })
  doc.text(`Statusas: ${lt(invoice.status)}`, w - 14, 38, { align: 'right' })

  // Client block
  let y = 58
  doc.setTextColor(50, 50, 70)
  doc.setFillColor(240, 240, 250)
  doc.rect(14, y - 8, w - 28, contact ? 38 : 16, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.text('KLIENTAS:', 18, y)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  if (contact) {
    doc.text(lt(contact.name), 18, y + 8)
    if (contact.company) { doc.text(lt(contact.company), 18, y + 15); y += 7 }
    if (contact.email) { doc.text(contact.email, 18, y + 15); y += 7 }
    if (contact.phone) { doc.text(contact.phone, 18, y + 15); y += 7 }
  }
  y += 28

  // Table header
  y += 6
  doc.setFillColor(99, 102, 241)
  doc.rect(14, y - 6, w - 28, 10, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(255, 255, 255)
  doc.text('Paslauga', 18, y)
  doc.text('Kiekis', w - 85, y, { align: 'right' })
  doc.text('Kaina EUR', w - 50, y, { align: 'right' })
  doc.text('Suma EUR', w - 14, y, { align: 'right' })

  // Table rows
  doc.setFont('helvetica', 'normal')
  invoice.items.forEach((item, i) => {
    y += 10
    if (i % 2 === 0) {
      doc.setFillColor(248, 248, 255)
      doc.rect(14, y - 6, w - 28, 10, 'F')
    }
    doc.setTextColor(50, 50, 70)
    const rowTotal = (parseFloat(item.qty) || 0) * (parseFloat(item.price) || 0)
    doc.text(lt(item.name) || '—', 18, y)
    doc.text(String(item.qty), w - 85, y, { align: 'right' })
    doc.text(parseFloat(item.price || 0).toFixed(2), w - 50, y, { align: 'right' })
    doc.text(rowTotal.toFixed(2), w - 14, y, { align: 'right' })
  })

  // Totals
  y += 16
  doc.setDrawColor(200, 200, 230)
  doc.line(w - 100, y - 8, w - 14, y - 8)
  doc.setTextColor(80, 80, 100)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text('Suma be PVM:', w - 55, y, { align: 'right' })
  doc.text(`${invoice.subtotal.toFixed(2)} EUR`, w - 14, y, { align: 'right' })
  y += 8
  doc.text('PVM 21%:', w - 55, y, { align: 'right' })
  doc.text(`${invoice.vat.toFixed(2)} EUR`, w - 14, y, { align: 'right' })
  y += 10
  doc.setFillColor(99, 102, 241)
  doc.rect(w - 100, y - 7, 86, 12, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(255, 255, 255)
  doc.text('IS VISO:', w - 55, y, { align: 'right' })
  doc.text(`${invoice.total.toFixed(2)} EUR`, w - 14, y, { align: 'right' })

  // Notes
  if (invoice.notes) {
    y += 20
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(10)
    doc.setTextColor(120, 120, 140)
    doc.text('Pastabos: ' + lt(invoice.notes), 14, y, { maxWidth: w - 28 })
  }

  // Footer
  const ph = doc.internal.pageSize.getHeight()
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(160, 160, 180)
  doc.line(14, ph - 18, w - 14, ph - 18)
  doc.text('Sugeneruota ManoKRM sistema', w / 2, ph - 10, { align: 'center' })

  doc.save(`saskaita-${invoice.number}.pdf`)
}
