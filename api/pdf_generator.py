from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.enums import TA_RIGHT, TA_CENTER
from datetime import datetime
import io

class QuotationPDFGenerator:
    def __init__(self):
        self.styles = getSampleStyleSheet()
        
        # Arabic-friendly styles
        self.arabic_style = ParagraphStyle(
            'Arabic',
            parent=self.styles['Normal'],
            fontName='Helvetica',
            fontSize=12,
            alignment=TA_RIGHT,
            wordWrap='RTL'
        )
        
        self.arabic_title = ParagraphStyle(
            'ArabicTitle',
            parent=self.styles['Title'],
            fontName='Helvetica-Bold',
            fontSize=20,
            alignment=TA_CENTER
        )
    
    def generate_quotation_pdf(self, quotation_data, company=None):
        """Generate quotation PDF and return as bytes"""
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=2*cm, leftMargin=2*cm, topMargin=2*cm, bottomMargin=2*cm)
        
        elements = []
        
        # Company Header - Use company info if available
        company_name_ar = company.get('name', 'تسعيّر') if company else 'تسعيّر'
        company_name_en = company.get('code', 'Tas\'eer') if company else 'Tas\'eer'
        
        elements.append(Paragraph(company_name_ar, self.arabic_title))
        elements.append(Paragraph(company_name_en, self.arabic_title))
        elements.append(Spacer(1, 0.5*cm))
        
        # Quotation Info
        info_data = [
            ["Quotation Number / رقم عرض الأسعار", quotation_data['quotation_number']],
            ["Date / التاريخ", datetime.fromisoformat(quotation_data['created_at']).strftime('%Y-%m-%d')],
            ["Customer / العميل", quotation_data['customer_name']],
            ["Phone / الجوال", quotation_data['customer_phone']],
        ]
        
        if quotation_data.get('customer_email'):
            info_data.append(["Email / البريد", quotation_data['customer_email']])
        
        info_table = Table(info_data, colWidths=[8*cm, 9*cm])
        info_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, -1), colors.lightgrey),
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
            ('ALIGN', (0, 0), (-1, -1), 'RIGHT'),
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ]))
        elements.append(info_table)
        elements.append(Spacer(1, 1*cm))
        
        # Items Table
        items_header = ['Total\nالمجموع', 'Price\nالسعر', 'Qty\nالكمية', 'Year\nالسنة', 'Model\nالموديل', 'Brand\nالماركة', 'Part Name\nاسم القطعة', 'Part No.\nرقم القطعة', '#']
        items_data = [items_header]
        
        for idx, item in enumerate(quotation_data['items'], 1):
            row = [
                f"{item['total_price']:.2f}",
                f"{item['unit_price']:.2f}",
                str(item['quantity']),
                item.get('car_year', '-'),
                item.get('car_model', '-'),
                item.get('car_brand', '-'),
                item['part_name'],
                item['part_number'],
                str(idx)
            ]
            items_data.append(row)
        
        # Add totals
        items_data.append(['', '', '', '', '', '', '', 'Subtotal / المجموع الفرعي', f"{quotation_data['subtotal']:.2f}"])
        items_data.append(['', '', '', '', '', '', '', f"VAT (15%) / ضريبة القيمة المضافة", f"{quotation_data['vat_amount']:.2f}"])
        items_data.append(['', '', '', '', '', '', '', 'Total / الإجمالي', f"{quotation_data['total_amount']:.2f} SAR"])
        
        items_table = Table(items_data, colWidths=[2*cm, 2*cm, 1.5*cm, 1.5*cm, 2*cm, 2*cm, 4*cm, 2*cm, 1*cm])
        items_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -3), colors.beige),
            ('GRID', (0, 0), (-1, -3), 1, colors.black),
            # Totals styling
            ('BACKGROUND', (0, -3), (-1, -1), colors.lightgrey),
            ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
            ('SPAN', (0, -3), (-2, -3)),
            ('SPAN', (0, -2), (-2, -2)),
            ('SPAN', (0, -1), (-2, -1)),
            ('ALIGN', (-2, -3), (-2, -1), 'RIGHT'),
            ('ALIGN', (-1, -3), (-1, -1), 'RIGHT'),
        ]))
        elements.append(items_table)
        elements.append(Spacer(1, 1*cm))
        
        # Notes
        if quotation_data.get('notes'):
            elements.append(Paragraph(f"<b>Notes / ملاحظات:</b> {quotation_data['notes']}", self.arabic_style))
            elements.append(Spacer(1, 0.5*cm))
        
        # Footer
        footer_text = "Thank you for your business | شكراً لتعاملكم معنا"
        elements.append(Paragraph(footer_text, self.arabic_style))
        
        # Build PDF
        doc.build(elements)
        
        # Get PDF bytes
        pdf_bytes = buffer.getvalue()
        buffer.close()
        
        return pdf_bytes
