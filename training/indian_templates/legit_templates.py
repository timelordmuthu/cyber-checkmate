"""
training/indian_templates/legit_templates.py
--------------------------------------------
Indian legitimate message templates for CyberCheckmate training data.

Rules (from PRD FR7, 16.1):
- 7 categories × ≥6 genuinely different templates each.
- Some MUST contain scam-like words (OTP, account, verify, KYC) to
  teach the model that these words alone don't indicate scam.
- template_id format: "in_legit_<category>_<k>"
- Slots: {name} {amount} {phone} {date} {bank} {otp} {ref}
  (no {link} slot — legit messages rarely contain raw clickable links)
"""

from __future__ import annotations

LEGIT_TEMPLATES: list[dict] = [

    # ====================================================================
    # 1. otp  (7 templates)
    # Must include "do not share this OTP" variants
    # ====================================================================
    {
        "template_id": "in_legit_otp_0",
        "category": "otp",
        "template": (
            "{otp} is your {bank} OTP for login. "
            "Do not share this OTP with anyone. Valid for 10 mins. "
            "If not requested, call {phone}."
        ),
    },
    {
        "template_id": "in_legit_otp_1",
        "category": "otp",
        "template": (
            "Your OTP for UPI transaction of Rs.{amount} is {otp}. "
            "NEVER share this OTP. {bank} will never ask for your OTP."
        ),
    },
    {
        "template_id": "in_legit_otp_2",
        "category": "otp",
        "template": (
            "{otp} — yeh aapka {bank} net banking OTP hai. "
            "Kisi ke saath share mat karein. 5 minute mein expire hoga."
        ),
    },
    {
        "template_id": "in_legit_otp_3",
        "category": "otp",
        "template": (
            "आपका OTP है {otp}। इसे किसी के साथ साझा न करें। "
            "{bank} कभी भी OTP नहीं माँगता। — {bank} Bank"
        ),
    },
    {
        "template_id": "in_legit_otp_4",
        "category": "otp",
        "template": (
            "Use {otp} to verify your mobile number on {bank} app. "
            "This OTP is valid for 3 minutes. Do not share with anyone."
        ),
    },
    {
        "template_id": "in_legit_otp_5",
        "category": "otp",
        "template": (
            "Dear {name}, {otp} is your one-time password for password reset. "
            "If you didn't request this, please contact us at {phone} immediately."
        ),
    },
    {
        "template_id": "in_legit_otp_6",
        "category": "otp",
        "template": (
            "IRCTC OTP: {otp} — Do not share. Valid 5 min. "
            "For booking ref {ref}. Helpline: {phone}."
        ),
    },

    # ====================================================================
    # 2. bank_debit_credit_alert  (7 templates)
    # ====================================================================
    {
        "template_id": "in_legit_bank_debit_credit_alert_0",
        "category": "bank_debit_credit_alert",
        "template": (
            "Rs.{amount} debited from {bank} a/c ending XXXX on {date}. "
            "Available balance Rs.{amount}. Not you? Call {phone}."
        ),
    },
    {
        "template_id": "in_legit_bank_debit_credit_alert_1",
        "category": "bank_debit_credit_alert",
        "template": (
            "Dear {name}, Rs.{amount} credited to your {bank} account on {date}. "
            "Ref no: {ref}. Thank you for banking with us."
        ),
    },
    {
        "template_id": "in_legit_bank_debit_credit_alert_2",
        "category": "bank_debit_credit_alert",
        "template": (
            "{bank}: UPI txn of Rs.{amount} to merchant on {date} successful. "
            "UPI Ref {ref}. Balance: Rs.{amount}."
        ),
    },
    {
        "template_id": "in_legit_bank_debit_credit_alert_3",
        "category": "bank_debit_credit_alert",
        "template": (
            "आपके {bank} खाते से Rs.{amount} का लेन-देन {date} को हुआ। "
            "शेष राशि: Rs.{amount}। यदि आप नहीं हैं तो {phone} पर कॉल करें।"
        ),
    },
    {
        "template_id": "in_legit_bank_debit_credit_alert_4",
        "category": "bank_debit_credit_alert",
        "template": (
            "Your {bank} credit card bill of Rs.{amount} is due on {date}. "
            "Pay via net banking or UPI to avoid late fee. Ref: {ref}."
        ),
    },
    {
        "template_id": "in_legit_bank_debit_credit_alert_5",
        "category": "bank_debit_credit_alert",
        "template": (
            "{bank}: ATM withdrawal Rs.{amount} from ATM ID {ref} on {date}. "
            "If not done by you, block card immediately: {phone}."
        ),
    },
    {
        "template_id": "in_legit_bank_debit_credit_alert_6",
        "category": "bank_debit_credit_alert",
        "template": (
            "NEFT of Rs.{amount} from {name} received in your {bank} account. "
            "UTR: {ref}. Date: {date}."
        ),
    },

    # ====================================================================
    # 3. delivery_update  (6 templates)
    # ====================================================================
    {
        "template_id": "in_legit_delivery_update_0",
        "category": "delivery_update",
        "template": (
            "Your Amazon order #{ref} is out for delivery today. "
            "Expected by 7 PM. Track: amazon.in/orders"
        ),
    },
    {
        "template_id": "in_legit_delivery_update_1",
        "category": "delivery_update",
        "template": (
            "Flipkart: Your order #{ref} has been shipped. "
            "Estimated delivery: {date}. Track at flipkart.com."
        ),
    },
    {
        "template_id": "in_legit_delivery_update_2",
        "category": "delivery_update",
        "template": (
            "DTDC: Your parcel {ref} from {name} is arriving {date}. "
            "Delivery agent will call on {phone}. Ensure someone is available."
        ),
    },
    {
        "template_id": "in_legit_delivery_update_3",
        "category": "delivery_update",
        "template": (
            "India Post Speed Post {ref}: Delivered at doorstep on {date}. "
            "Received by: {name}. —India Post"
        ),
    },
    {
        "template_id": "in_legit_delivery_update_4",
        "category": "delivery_update",
        "template": (
            "Aapka parcel #{ref} kal {date} ko deliver hoga. "
            "Ghar par rehein. Delivery agent ka number: {phone}."
        ),
    },
    {
        "template_id": "in_legit_delivery_update_5",
        "category": "delivery_update",
        "template": (
            "Zomato/Swiggy: Your order from {name} restaurant is on the way. "
            "Arrives in 30 min. Order ID: {ref}."
        ),
    },

    # ====================================================================
    # 4. utility_bill_reminder  (6 templates)
    # ====================================================================
    {
        "template_id": "in_legit_utility_bill_reminder_0",
        "category": "utility_bill_reminder",
        "template": (
            "Reminder: Your electricity bill of Rs.{amount} is due on {date}. "
            "Pay at BESCOM app, BBMP counter or authorised outlets. Ref: {ref}."
        ),
    },
    {
        "template_id": "in_legit_utility_bill_reminder_1",
        "category": "utility_bill_reminder",
        "template": (
            "BSNL: Your broadband bill Rs.{amount} due on {date}. "
            "Pay at bsnl.co.in or your nearest BSNL office. Consumer ID: {ref}."
        ),
    },
    {
        "template_id": "in_legit_utility_bill_reminder_2",
        "category": "utility_bill_reminder",
        "template": (
            "Jio: Your monthly recharge of Rs.{amount} is due on {date}. "
            "Recharge via MyJio app or jio.com."
        ),
    },
    {
        "template_id": "in_legit_utility_bill_reminder_3",
        "category": "utility_bill_reminder",
        "template": (
            "आपका पानी का बिल Rs.{amount} {date} को देय है। "
            "नगर निगम कार्यालय या ऑनलाइन पोर्टल पर भुगतान करें।"
        ),
    },
    {
        "template_id": "in_legit_utility_bill_reminder_4",
        "category": "utility_bill_reminder",
        "template": (
            "Gas cylinder booking confirmation: Your {name} LPG cylinder will be delivered on {date}. "
            "Pay Rs.{amount} to delivery person. Booking ref: {ref}."
        ),
    },
    {
        "template_id": "in_legit_utility_bill_reminder_5",
        "category": "utility_bill_reminder",
        "template": (
            "Airtel postpaid bill Rs.{amount} generated for {date}. "
            "Pay via Airtel Thanks app or airtel.in/pay. A/C: {ref}."
        ),
    },

    # ====================================================================
    # 5. college_exam_notice  (6 templates)
    # ====================================================================
    {
        "template_id": "in_legit_college_exam_notice_0",
        "category": "college_exam_notice",
        "template": (
            "VIT University: Your semester exam schedule is released. "
            "Log in to student portal to download your hall ticket. Exam from {date}."
        ),
    },
    {
        "template_id": "in_legit_college_exam_notice_1",
        "category": "college_exam_notice",
        "template": (
            "Dear {name}, your admit card for {ref} exam is available. "
            "Download before {date} from the official website."
        ),
    },
    {
        "template_id": "in_legit_college_exam_notice_2",
        "category": "college_exam_notice",
        "template": (
            "CBSE Board: Admit cards for Class 12 exam {date} are live. "
            "Download at cbse.gov.in using roll number. Contact school for issues."
        ),
    },
    {
        "template_id": "in_legit_college_exam_notice_3",
        "category": "college_exam_notice",
        "template": (
            "Anna University: Internal assessment marks for {ref} uploaded. "
            "Check via student login. Grievances by {date}."
        ),
    },
    {
        "template_id": "in_legit_college_exam_notice_4",
        "category": "college_exam_notice",
        "template": (
            "प्रिय {name}, आपकी परीक्षा {date} को होगी। "
            "प्रवेश पत्र विश्वविद्यालय पोर्टल से डाउनलोड करें।"
        ),
    },
    {
        "template_id": "in_legit_college_exam_notice_5",
        "category": "college_exam_notice",
        "template": (
            "JEE Main 2025: Your application ref {ref} received. "
            "Admit card will be available {date}. jeemain.nta.nic.in"
        ),
    },

    # ====================================================================
    # 6. legit_promotional  (6 templates — real ads, not scam)
    # ====================================================================
    {
        "template_id": "in_legit_promotional_0",
        "category": "legit_promotional",
        "template": (
            "Big Billion Day Sale starts {date} on Flipkart! "
            "Up to 80% off on mobiles, TVs and more. Open Flipkart app."
        ),
    },
    {
        "template_id": "in_legit_promotional_1",
        "category": "legit_promotional",
        "template": (
            "Reliance Jio: Recharge with Rs.{amount} and get 3 months extra validity. "
            "Offer valid till {date}. Recharge at MyJio."
        ),
    },
    {
        "template_id": "in_legit_promotional_2",
        "category": "legit_promotional",
        "template": (
            "{bank} Credit Card: Flat 10% cashback on groceries this weekend. "
            "Max cashback Rs.{amount}. T&C apply. —{bank}"
        ),
    },
    {
        "template_id": "in_legit_promotional_3",
        "category": "legit_promotional",
        "template": (
            "Swiggy Instamart: Fresh vegetables at best prices! "
            "Order now and get Rs.{amount} off on first order. Code: FRESH{ref}."
        ),
    },
    {
        "template_id": "in_legit_promotional_4",
        "category": "legit_promotional",
        "template": (
            "Vodafone: Upgrade to 5G plan at Rs.{amount}/month. "
            "Unlimited calls, 2GB/day. Visit nearest store or vodafone.in."
        ),
    },
    {
        "template_id": "in_legit_promotional_5",
        "category": "legit_promotional",
        "template": (
            "Amazon Prime Day {date}: Members get early access to deals. "
            "Up to 60% off on electronics. Open Amazon app."
        ),
    },

    # ====================================================================
    # 7. friend_family_chat  (6 templates — informal, personal)
    # ====================================================================
    {
        "template_id": "in_legit_friend_family_chat_0",
        "category": "friend_family_chat",
        "template": (
            "Hey {name}! Are you free this {date}? "
            "Planning to meet at {phone}'s place. Let me know."
        ),
    },
    {
        "template_id": "in_legit_friend_family_chat_1",
        "category": "friend_family_chat",
        "template": (
            "Bhai, aaj raat {date} ko dinner pe aa ja. "
            "Ghar pe sab hai. Call karo: {phone}."
        ),
    },
    {
        "template_id": "in_legit_friend_family_chat_2",
        "category": "friend_family_chat",
        "template": (
            "Hi {name}, please send me Rs.{amount} on PhonePe {phone}. "
            "Will pay back on {date}. Thanks!"
        ),
    },
    {
        "template_id": "in_legit_friend_family_chat_3",
        "category": "friend_family_chat",
        "template": (
            "Mummy ne bola {date} ko ghar aa jao. "
            "Sab theek hai, bas milna tha. —{name}"
        ),
    },
    {
        "template_id": "in_legit_friend_family_chat_4",
        "category": "friend_family_chat",
        "template": (
            "Your KYC at our branch is scheduled for {date} at 11 AM. "
            "Please bring Aadhaar and PAN original. Visit branch, no online needed. —{bank}"
        ),
    },
    {
        "template_id": "in_legit_friend_family_chat_5",
        "category": "friend_family_chat",
        "template": (
            "OTP for your IRCTC seat upgrade confirmation is {otp}. "
            "Do not share. Valid 5 min. PNR: {ref}."
        ),
    },

    # ====================================================================
    # 8. police_awareness  (6 templates — real awareness messages)
    # ====================================================================
    {
        "template_id": "in_legit_police_awareness_0",
        "category": "police_awareness",
        "template": (
            "Cyber Crime Advisory: Police never ask you to stay on a video call "
            "or transfer money to 'safe accounts'. If threatened, hang up and report at 1930."
        ),
    },
    {
        "template_id": "in_legit_police_awareness_1",
        "category": "police_awareness",
        "template": (
            "Cyberabad Police alert: 'Digital arrest' is a scam. "
            "No agency conducts arrests over WhatsApp video call. "
            "Report such calls at cybercrime.gov.in or dial 1930."
        ),
    },
    {
        "template_id": "in_legit_police_awareness_2",
        "category": "police_awareness",
        "template": (
            "सावधान! पुलिस या CBI कभी भी वीडियो कॉल पर गिरफ्तारी नहीं करती। "
            "अगर कोई ऐसा दावा करे तो तुरंत 1930 पर रिपोर्ट करें। "
            "— साइबर क्राइम प्रभाग"
        ),
    },
    {
        "template_id": "in_legit_police_awareness_3",
        "category": "police_awareness",
        "template": (
            "Mumbai Police Cybercell: Beware of fake investment schemes promising guaranteed returns. "
            "SEBI-registered advisors never ask for upfront fees. "
            "Report fraud: 1930 or cybercrime.gov.in."
        ),
    },
    {
        "template_id": "in_legit_police_awareness_4",
        "category": "police_awareness",
        "template": (
            "Dhyan rakhein: Koi bhi sarkari agency OTP, AnyDesk code ya bank details "
            "phone ya WhatsApp pe nahi maangti. Aisi call aaye toh {phone} pe report karein."
        ),
    },
    {
        "template_id": "in_legit_police_awareness_5",
        "category": "police_awareness",
        "template": (
            "National Cyber Crime Helpline 1930: If you receive messages threatening arrest, "
            "demanding money to avoid FIR, or asking for OTP — it is a scam. "
            "Block the number and report immediately."
        ),
    },

    # ====================================================================
    # 9. bank_security_alert  (6 templates — genuine bank warnings)
    # ====================================================================
    {
        "template_id": "in_legit_bank_security_alert_0",
        "category": "bank_security_alert",
        "template": (
            "{bank} Security Alert: We will NEVER ask for your OTP, PIN, or card details over the phone. "
            "If you receive such a call, please visit your nearest branch or call the number on the back of your card."
        ),
    },
    {
        "template_id": "in_legit_bank_security_alert_1",
        "category": "bank_security_alert",
        "template": (
            "Dear {name}, {bank} never sends links for KYC update via SMS. "
            "For KYC renewal, please visit your home branch with original documents. "
            "Customer care: number on back of your card only."
        ),
    },
    {
        "template_id": "in_legit_bank_security_alert_2",
        "category": "bank_security_alert",
        "template": (
            "{bank} Advisory: Fraudsters may pose as our staff asking to install remote-access apps. "
            "We never ask for AnyDesk or TeamViewer access. "
            "Block such callers and report to 1930."
        ),
    },
    {
        "template_id": "in_legit_bank_security_alert_3",
        "category": "bank_security_alert",
        "template": (
            "सूचना: {bank} बैंक की ओर से कोई भी OTP या ATM PIN फ़ोन पर नहीं माँगा जाता। "
            "अगर ऐसी कोई कॉल आए तो अपनी शाखा में जाएं या {phone} पर रिपोर्ट करें।"
        ),
    },
    {
        "template_id": "in_legit_bank_security_alert_4",
        "category": "bank_security_alert",
        "template": (
            "{bank}: Your account has been temporarily restricted due to unusual activity on {date}. "
            "No action needed from you online. Visit your branch with photo ID to restore access. "
            "Ref: {ref}."
        ),
    },
    {
        "template_id": "in_legit_bank_security_alert_5",
        "category": "bank_security_alert",
        "template": (
            "{bank} Fraud Alert: Aapke account mein suspicious activity detect hua. "
            "Hum aapse koi link ya OTP nahi maangenge. "
            "Branch mein aayein ya card ke peeche likha number use karein."
        ),
    },

    # ====================================================================
    # 10. investment_legit  (6 templates — genuine broker / MF statements)
    # ====================================================================
    {
        "template_id": "in_legit_investment_legit_0",
        "category": "investment_legit",
        "template": (
            "Zerodha: Your SIP of Rs.{amount} in {name} Mutual Fund processed on {date}. "
            "Folio: {ref}. Mutual fund investments are subject to market risks. "
            "Read all scheme documents carefully."
        ),
    },
    {
        "template_id": "in_legit_investment_legit_1",
        "category": "investment_legit",
        "template": (
            "HDFC Securities: Your equity trade of Rs.{amount} executed on {date}. "
            "Ledger balance: Rs.{amount}. Contract note ref: {ref}. "
            "Past performance is not a guarantee of future returns."
        ),
    },
    {
        "template_id": "in_legit_investment_legit_2",
        "category": "investment_legit",
        "template": (
            "Groww: {name} Fund NAV update — current value of your investment Rs.{amount}. "
            "No guaranteed returns. Invest at your own risk. Statement ref: {ref}."
        ),
    },
    {
        "template_id": "in_legit_investment_legit_3",
        "category": "investment_legit",
        "template": (
            "आपके म्यूचुअल फंड खाते में {date} को SIP रु.{amount} जमा हुई। "
            "Folio: {ref}। निवेश बाज़ार जोखिमों के अधीन है। "
            "किसी भी गारंटीड रिटर्न के दावे पर विश्वास न करें।"
        ),
    },
    {
        "template_id": "in_legit_investment_legit_4",
        "category": "investment_legit",
        "template": (
            "Angel One: Your demat account statement for {date} is ready. "
            "Portfolio value: Rs.{amount}. Login to angelone.in to view. "
            "No link shared here. We never ask for OTP or password."
        ),
    },
    {
        "template_id": "in_legit_investment_legit_5",
        "category": "investment_legit",
        "template": (
            "SEBI reminder: Beware of unregistered advisors promising fixed returns. "
            "Check adviser registration at sebi.gov.in before investing. "
            "Report fraud: SEBI helpline {phone}."
        ),
    },

    # ====================================================================
    # 11. customer_care_legit  (6 templates — real service replies)
    # ====================================================================
    {
        "template_id": "in_legit_customer_care_legit_0",
        "category": "customer_care_legit",
        "template": (
            "{bank} Customer Support: Your complaint ref {ref} has been registered. "
            "Our team will respond within 3 working days. "
            "We will NEVER ask for your OTP or card PIN during resolution."
        ),
    },
    {
        "template_id": "in_legit_customer_care_legit_1",
        "category": "customer_care_legit",
        "template": (
            "Amazon Help: Your return request #{ref} approved. "
            "Refund of Rs.{amount} will reflect in {date}. "
            "No action needed — we will never ask for your UPI PIN."
        ),
    },
    {
        "template_id": "in_legit_customer_care_legit_2",
        "category": "customer_care_legit",
        "template": (
            "Airtel Support: Ticket #{ref} raised for your broadband issue. "
            "Technician visit scheduled on {date} between 10 AM – 1 PM. "
            "Our team never asks for remote access or OTP."
        ),
    },
    {
        "template_id": "in_legit_customer_care_legit_3",
        "category": "customer_care_legit",
        "template": (
            "Paytm Support: Aapki complaint #{ref} receive ho gayi. "
            "3 business days mein resolve hogi. "
            "Hum kabhi bhi OTP ya wallet PIN nahi maangenge."
        ),
    },
    {
        "template_id": "in_legit_customer_care_legit_4",
        "category": "customer_care_legit",
        "template": (
            "IRCTC Customer Care: Your ticket PNR {ref} cancellation refund of Rs.{amount} "
            "will be credited to your {bank} account by {date}. "
            "No OTP or card details required from your end."
        ),
    },
    {
        "template_id": "in_legit_customer_care_legit_5",
        "category": "customer_care_legit",
        "template": (
            "Flipkart Support: Complaint ID {ref} lodged for your order issue. "
            "Resolution expected by {date}. "
            "Please note: Flipkart never asks for your bank OTP or password."
        ),
    },
]
