from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image, PageBreak
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.enums import TA_RIGHT, TA_CENTER, TA_LEFT
from datetime import datetime
import io
import barcode
from barcode.writer import ImageWriter
from PIL import Image as PILImage
import tempfile
import os

class QuotationPDFGeneratorV2:
    def __init__(self, company_info=None):
        self.styles = getSampleStyleSheet()
        self.company_info = company_info or {}
        
        # Arabic-friendly styles
        self.arabic_style = ParagraphStyle(
            'Arabic',
            parent=self.styles['Normal'],
            fontName='Helvetica',
            fontSize=11,
            alignment=TA_RIGHT,
            wordWrap='RTL'
        )
        
        self.arabic_title = ParagraphStyle(
            'ArabicTitle',
            parent=self.styles['Title'],
            fontName='Helvetica-Bold',
            fontSize=24,
            alignment=TA_CENTER,
            textColor=colors.HexColor(self.company_info.get('primary_color', '#0F172A'))
        )
        
        self.arabic_subtitle = ParagraphStyle(
            'ArabicSubtitle',
            parent=self.styles['Normal'],
            fontName='Helvetica-Bold',
            fontSize=14,
            alignment=TA_CENTER,
            textColor=colors.HexColor(self.company_info.get('secondary_color', '#64748B'))
        )
        
        self.table_header_style = ParagraphStyle(
            'TableHeader',
            parent=self.styles['Normal'],
            fontName='Helvetica-Bold',
            fontSize=10,
            alignment=TA_CENTER,
            textColor=colors.whitesmoke
        )
    
    def generate_barcode(self, part_number):
        """Generate barcode image for part number"""
        try:
            # Create temporary file for barcode
            temp_dir = tempfile.gettempdir()
            barcode_file = os.path.join(temp_dir, f"barcode_{part_number}")
            
            # Generate barcode (CODE128 format)
            barcode_instance = barcode.get('code128', part_number, writer=ImageWriter())
            barcode_path = barcode_instance.save(barcode_file)
            
            return barcode_path
        except Exception as e:
            print(f"Error generating barcode: {e}")
            return None
    
    def generate_quotation_pdf(self, quotation_data, company=None):
        """Generate quotation PDF with improved design and barcode"""
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer, 
            pagesize=A4, 
            rightMargin=1.5*cm, 
            leftMargin=1.5*cm, 
            topMargin=1.5*cm, 
            bottomMargin=1.5*cm
        )
        
        elements = []
        
        # Use provided company or fallback
        company_name_ar = company.get('name', 'تسعيّر') if company else 'تسعيّر'
        company_code = company.get('code', 'TASEER') if company else 'TASEER'
        primary_color = company.get('primary_color', '#0F172A') if company else '#0F172A'
        secondary_color = company.get('secondary_color', '#64748B') if company else '#64748B'
        
        # Header with company branding
        header_data = [
            [
                Paragraph(company_name_ar, self.arabic_title),
                Paragraph("عرض سعر", ParagraphStyle(
                    'QuotationTitle',
                    parent=self.styles['Normal'],
                    fontName='Helvetica-Bold',
                    fontSize=20,
                    alignment=TA_CENTER,
                    textColor=colors.HexColor(primary_color)
                ))
            ]
        ]
        
        header_table = Table(header_data, colWidths=[8*cm, 9*cm])
        header_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('LEFTPADDING', (0, 0), (-1, -1), 10),
            ('RIGHTPADDING', (0, 0), (-1, -1), 10),
            ('TOPPADDING', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
        ]))
        elements.append(header_table)
        elements.append(Spacer(1, 0.3*cm))
        
        # Separator line
        separator_data = [['_' * 80]]
        separator_table = Table(separator_data, colWidths=[17*cm])
        separator_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.HexColor(secondary_color)),
        ]))
        elements.append(separator_table)
        elements.append(Spacer(1, 0.3*cm))
        
        # Quotation Info and Customer Details
        quotation_date = datetime.fromisoformat(quotation_data['created_at']).strftime('%Y-%m-%d')
        quotation_number = quotation_data.get('quotation_number', 'N/A')
        
        info_data = [
            ["رقم عرض الأسعار", quotation_number, "التاريخ", quotation_date],
            ["اسم العميل", quotation_data['customer_name'], "الجوال", quotation_data['customer_phone']],
        ]
        
        if quotation_data.get('customer_email'):
            info_data.append(["البريد الإلكتروني", quotation_data['customer_email'], "VIN", quotation_data.get('vin_number', '-')])
        
        info_table = Table(info_data, colWidths=[3*cm, 4*cm, 3*cm, 4*cm])
        info_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, -1), colors.HexColor(secondary_color)),
            ('TEXTCOLOR', (0, 0), (0, -1), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'RIGHT'),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('GRID', (0, 0), (-1, -1), 1, colors.grey),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('LEFTPADDING', (0, 0), (-1, -1), 8),
            ('RIGHTPADDING', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ]))
        elements.append(info_table)
        elements.append(Spacer(1, 0.4*cm))
        
        # Items Table with Barcode
        items_header = ['#', 'الباركود', 'رقم القطعة', 'اسم القطعة', 'الماركة', 'الموديل', 'السنة', 'الكمية', 'السعر', 'الإجمالي']
        items_data = [items_header]
        
        for idx, item in enumerate(quotation_data['items'], 1):
            # Generate barcode for this item
            barcode_path = self.generate_barcode(item['part_number'])
            barcode_img = None
            
            if barcode_path:
                try:
                    barcode_img = Image(barcode_path, width=1.5*cm, height=0.6*cm)
                except:
                    barcode_img = Paragraph("N/A", self.arabic_style)
            else:
                barcode_img = Paragraph("N/A", self.arabic_style)
            
            row = [
                str(idx),
                barcode_img,
                item['part_number'],
                item['part_name'][:20],  # Truncate long names
                item.get('car_brand', '-'),
                item.get('car_model', '-'),
                item.get('car_year', '-'),
                str(item['quantity']),
                f"{item['unit_price']:.2f}",
                f"{item['total_price']:.2f}"
            ]
            items_data.append(row)
        
        # Add totals row
        items_data.append([
            '', '', '', '', '', '', '', '',
            'المجموع الفرعي',
            f"{quotation_data['subtotal']:.2f}"
        ])
        items_data.append([
            '', '', '', '', '', '', '', '',
            'ضريبة القيمة المضافة (15%)',
            f"{quotation_data['vat_amount']:.2f}"
        ])
        items_data.append([
            '', '', '', '', '', '', '', '',
            'الإجمالي النهائي',
            f"{quotation_data['total_amount']:.2f} ر.س"
        ])
        
        items_table = Table(items_data, colWidths=[0.6*cm, 1.8*cm, 1.5*cm, 2*cm, 1.5*cm, 1.5*cm, 1*cm, 1*cm, 1.2*cm, 1.2*cm])
        items_table.setStyle(TableStyle([
            # Header styling
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor(primary_color)),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 8),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
            ('TOPPADDING', (0, 0), (-1, 0), 8),
            
            # Data rows
            ('BACKGROUND', (0, 1), (-1, -3), colors.HexColor('#F8FAFC')),
            ('ALIGN', (0, 1), (-1, -3), 'CENTER'),
            ('FONTSIZE', (0, 1), (-1, -3), 8),
            ('GRID', (0, 0), (-1, -3), 1, colors.grey),
            ('VALIGN', (0, 1), (-1, -3), 'MIDDLE'),
            ('LEFTPADDING', (0, 1), (-1, -3), 4),
            ('RIGHTPADDING', (0, 1), (-1, -3), 4),
            
            # Totals styling
            ('BACKGROUND', (0, -3), (-1, -1), colors.HexColor(secondary_color)),
            ('TEXTCOLOR', (0, -3), (-1, -1), colors.whitesmoke),
            ('FONTNAME', (0, -3), (-1, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, -3), (-1, -1), 9),
            ('ALIGN', (0, -3), (-1, -1), 'CENTER'),
            ('GRID', (0, -3), (-1, -1), 1, colors.grey),
            ('TOPPADDING', (0, -3), (-1, -1), 8),
            ('BOTTOMPADDING', (0, -3), (-1, -1), 8),
        ]))
        elements.append(items_table)
        elements.append(Spacer(1, 0.4*cm))
        
        # Notes section
        if quotation_data.get('notes'):
            notes_style = ParagraphStyle(
                'Notes',
                parent=self.styles['Normal'],
                fontName='Helvetica',
                fontSize=9,
                alignment=TA_RIGHT,
                wordWrap='RTL'
            )
            elements.append(Paragraph(f"<b>ملاحظات:</b> {quotation_data['notes']}", notes_style))
            elements.append(Spacer(1, 0.3*cm))
        
        # Footer
        footer_style = ParagraphStyle(
            'Footer',
            parent=self.styles['Normal'],
            fontName='Helvetica-Oblique',
            fontSize=9,
            alignment=TA_CENTER,
            textColor=colors.HexColor(secondary_color)
        )
        footer_text = f"شكراً لتعاملكم معنا | {company_code} © {datetime.now().year}"
        elements.append(Paragraph(footer_text, footer_style))
        
        # Build PDF
        doc.build(elements)
        
        # Get PDF bytes
        pdf_bytes = buffer.getvalue()
        buffer.close()
        
        return pdf_bytes
