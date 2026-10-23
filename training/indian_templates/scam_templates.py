"""
training/indian_templates/scam_templates.py
-------------------------------------------
Indian scam message templates for CyberCheckmate training data.

Rules (from PRD FR7, 16.1):
- 8 categories × ≥6 genuinely different templates each.
- Slots: {name} {amount} {phone} {link} {date} {bank}
- Fictional phones (98XXXXXX01 style), fictional scam domains (never real).
- Mix of English, Hinglish (Latin script) and Devanagari.
- Obfuscation variety: K.Y.C, 0TP, verifi, spac ed words.
- NO e-challan / traffic-fine content (reserved for adaptation demo).
- template_id format: "in_scam_<category>_<k>"

Each entry is a dict with keys: template_id, template, category.
Use generate_indian_messages.py to expand slots → actual messages.
"""

from __future__ import annotations

SCAM_TEMPLATES: list[dict] = [

    # ====================================================================
    # 1. fake_kyc  (8 templates)
    # ====================================================================
    {
        "template_id": "in_scam_fake_kyc_0",
        "category": "fake_kyc",
        "template": (
            "Dear {name}, your {bank} account K.Y.C is pending. "
            "Failure to update within 24 hrs will result in account suspension. "
            "Click here: {link}"
        ),
    },
    {
        "template_id": "in_scam_fake_kyc_1",
        "category": "fake_kyc",
        "template": (
            "URGENT: {bank} KYC verification required. "
            "Your account will be BLOCKED today. "
            "Complete now at {link} — share 0TP with our executive to confirm."
        ),
    },
    {
        "template_id": "in_scam_fake_kyc_2",
        "category": "fake_kyc",
        "template": (
            "Namaste {name}, Aapka {bank} account ka KYC expire ho gaya hai. "
            "Turant update karein: {link} "
            "Helpline: {phone}"
        ),
    },
    {
        "template_id": "in_scam_fake_kyc_3",
        "category": "fake_kyc",
        "template": (
            "प्रिय {name}, आपके {bank} खाते का KYC अपडेट आवश्यक है। "
            "अभी करें: {link} — अन्यथा {date} से खाता बंद हो जाएगा।"
        ),
    },
    {
        "template_id": "in_scam_fake_kyc_4",
        "category": "fake_kyc",
        "template": (
            "Your {bank} a/c k y c is incomplete. "
            "RBI has mandated all accounts to verifi KYC by {date}. "
            "Visit {link} immediately."
        ),
    },
    {
        "template_id": "in_scam_fake_kyc_5",
        "category": "fake_kyc",
        "template": (
            "Dear Customer, we noticed your KYC documents are outdated. "
            "To avoid account freeze, submit your Aadhaar & PAN at {link}. "
            "For help call {phone}."
        ),
    },
    {
        "template_id": "in_scam_fake_kyc_6",
        "category": "fake_kyc",
        "template": (
            "{bank} Alert: KYC nahi hua toh aapka net banking band ho jayega aaj. "
            "Abhi complete karein → {link}"
        ),
    },
    {
        "template_id": "in_scam_fake_kyc_7",
        "category": "fake_kyc",
        "template": (
            "Dear {name}, As per new RBI guidelines your mobile number must be re-linked. "
            "Share the OTP you receive with our agent at {phone} to verify. "
            "Or update at {link}."
        ),
    },

    # ====================================================================
    # 2. upi_refund_collect (8 templates)
    # ====================================================================
    {
        "template_id": "in_scam_upi_refund_collect_0",
        "category": "upi_refund_collect",
        "template": (
            "Congratulations! A refund of Rs.{amount} has been initiated to your UPI. "
            "Accept it now: {link}  "
            "Offer expires in 2 hours."
        ),
    },
    {
        "template_id": "in_scam_upi_refund_collect_1",
        "category": "upi_refund_collect",
        "template": (
            "Dear {name}, your electricity refund of Rs.{amount} is ready. "
            "Enter your UPI PIN at {link} to receive it instantly."
        ),
    },
    {
        "template_id": "in_scam_upi_refund_collect_2",
        "category": "upi_refund_collect",
        "template": (
            "UPI Collect Request: Rs.{amount} se aapka wallet recharge hoga. "
            "PIN daalo aur paisa lo: {link}  "
            "Help: {phone}"
        ),
    },
    {
        "template_id": "in_scam_upi_refund_collect_3",
        "category": "upi_refund_collect",
        "template": (
            "आपको Rs.{amount} का UPI रिफ़ंड प्राप्त होगा। "
            "अभी accept करें: {link} — यह offer सिर्फ {date} तक valid है।"
        ),
    },
    {
        "template_id": "in_scam_upi_refund_collect_4",
        "category": "upi_refund_collect",
        "template": (
            "BHIM UPI: You have received a payment request of Rs.{amount}. "
            "Scan or click {link} and enter your UPI PIN to accept."
        ),
    },
    {
        "template_id": "in_scam_upi_refund_collect_5",
        "category": "upi_refund_collect",
        "template": (
            "Your GST refund of Rs.{amount} is approved. "
            "To credit to your bank account provide net banking credentials at {link}. "
            "Contact: {phone}"
        ),
    },
    {
        "template_id": "in_scam_upi_refund_collect_6",
        "category": "upi_refund_collect",
        "template": (
            "Paytm cashback Rs.{amount} credited to wallet. "
            "Withdraw karein: {link} — sirf aaj tak."
        ),
    },
    {
        "template_id": "in_scam_upi_refund_collect_7",
        "category": "upi_refund_collect",
        "template": (
            "Your online order refund of Rs.{amount} could not be processed automatically. "
            "Please share your UPI ID and OTP with our agent {phone} to process manually."
        ),
    },

    # ====================================================================
    # 3. electricity_disconnection (7 templates)
    # ====================================================================
    {
        "template_id": "in_scam_electricity_disconnection_0",
        "category": "electricity_disconnection",
        "template": (
            "NOTICE: Your electricity connection will be disconnected tonight due to unpaid dues. "
            "Pay Rs.{amount} immediately at {link} or call {phone}."
        ),
    },
    {
        "template_id": "in_scam_electricity_disconnection_1",
        "category": "electricity_disconnection",
        "template": (
            "Dear {name}, BESCOM/MSEDCL: Last warning — settle outstanding Rs.{amount} by {date}. "
            "Click {link} to pay and avoid disconnection."
        ),
    },
    {
        "template_id": "in_scam_electricity_disconnection_2",
        "category": "electricity_disconnection",
        "template": (
            "आपकी बिजली {date} को काट दी जाएगी। "
            "Rs.{amount} का भुगतान अभी करें: {link}"
        ),
    },
    {
        "template_id": "in_scam_electricity_disconnection_3",
        "category": "electricity_disconnection",
        "template": (
            "Bijli department se notice: Aapka meter {date} ko disconnect hoga. "
            "Turant bill pay karein Rs.{amount} — {link}"
        ),
    },
    {
        "template_id": "in_scam_electricity_disconnection_4",
        "category": "electricity_disconnection",
        "template": (
            "Electricity Board: Due to technical update, please reverify your meter number "
            "and pay pending dues Rs.{amount} at {link}. Helpdesk: {phone}."
        ),
    },
    {
        "template_id": "in_scam_electricity_disconnection_5",
        "category": "electricity_disconnection",
        "template": (
            "Final reminder from power dept: Your consumer ID has an overdue of Rs.{amount}. "
            "Reconnection fee will double after {date}. Pay: {link}"
        ),
    },
    {
        "template_id": "in_scam_electricity_disconnection_6",
        "category": "electricity_disconnection",
        "template": (
            "URGENT power cut alert for your area on {date}. "
            "To avoid personal disconnection pay Rs.{amount} online: {link} — within 2 hours."
        ),
    },

    # ====================================================================
    # 4. customs_courier (7 templates)
    # ====================================================================
    {
        "template_id": "in_scam_customs_courier_0",
        "category": "customs_courier",
        "template": (
            "CUSTOMS NOTICE: A parcel addressed to {name} is held at airport. "
            "Pay clearance fee Rs.{amount} within 48 hrs or it will be seized. "
            "Details: {link}"
        ),
    },
    {
        "template_id": "in_scam_customs_courier_1",
        "category": "customs_courier",
        "template": (
            "Dear {name}, your international courier from UK contains undeclared items. "
            "To release, pay Rs.{amount} customs duty at {link} or call {phone}."
        ),
    },
    {
        "template_id": "in_scam_customs_courier_2",
        "category": "customs_courier",
        "template": (
            "FedEx/DHL: Your package shipment ID#{amount} is on hold. "
            "Customs duty unpaid — pay now: {link}  Ignore = package returned."
        ),
    },
    {
        "template_id": "in_scam_customs_courier_3",
        "category": "customs_courier",
        "template": (
            "आपका पार्सल दिल्ली एयरपोर्ट कस्टम्स में रोका गया है। "
            "Rs.{amount} का शुल्क जमा करें: {link} — {date} के बाद जब्त होगा।"
        ),
    },
    {
        "template_id": "in_scam_customs_courier_4",
        "category": "customs_courier",
        "template": (
            "CBI Cybercrime: A parcel in your name contains banned substances. "
            "Report immediately at {phone} or you may face arrest. "
            "Pay compliance bond Rs.{amount}: {link}"
        ),
    },
    {
        "template_id": "in_scam_customs_courier_5",
        "category": "customs_courier",
        "template": (
            "India Post: Your speed post is undelivered due to address mismatch. "
            "Pay re-delivery Rs.{amount} and update address: {link}"
        ),
    },
    {
        "template_id": "in_scam_customs_courier_6",
        "category": "customs_courier",
        "template": (
            "Parcel from Amazon/Flipkart warehoused due to pending customs. "
            "Release your item by paying Rs.{amount} at {link} before {date}."
        ),
    },

    # ====================================================================
    # 5. job_task_scam (7 templates)
    # ====================================================================
    {
        "template_id": "in_scam_job_task_scam_0",
        "category": "job_task_scam",
        "template": (
            "Work from home opportunity! Earn Rs.{amount}/day completing simple tasks. "
            "Registration fee Rs.500. Join: {link}  Contact: {phone}"
        ),
    },
    {
        "template_id": "in_scam_job_task_scam_1",
        "category": "job_task_scam",
        "template": (
            "Congratulations {name}! You are selected for online data entry job. "
            "Weekly salary Rs.{amount}. Pay training deposit Rs.999 at {link}."
        ),
    },
    {
        "template_id": "in_scam_job_task_scam_2",
        "category": "job_task_scam",
        "template": (
            "YouTube video like & subscribe karo, Rs.{amount} kamao per task. "
            "Abhi join karo: {link}  WhatsApp: {phone}"
        ),
    },
    {
        "template_id": "in_scam_job_task_scam_3",
        "category": "job_task_scam",
        "template": (
            "घर बैठे कमाई: रोज़ 3 घंटे काम करें और पाएं Rs.{amount}। "
            "अभी register करें: {link} — सीमित सीटें।"
        ),
    },
    {
        "template_id": "in_scam_job_task_scam_4",
        "category": "job_task_scam",
        "template": (
            "Dear {name}, your resume shortlisted for remote job at {amount} LPA. "
            "Pay security deposit Rs.2000 and join interview: {link}  HR: {phone}"
        ),
    },
    {
        "template_id": "in_scam_job_task_scam_5",
        "category": "job_task_scam",
        "template": (
            "Trusted task app: Complete 10 tasks earn Rs.{amount} daily. "
            "Withdraw directly to bank. Download: {link}"
        ),
    },
    {
        "template_id": "in_scam_job_task_scam_6",
        "category": "job_task_scam",
        "template": (
            "Freelance project available. Budget Rs.{amount}. "
            "To unlock tasks pay platform fee Rs.{amount} first. Details: {link}"
        ),
    },

    # ====================================================================
    # 6. lottery_cashback (7 templates)
    # ====================================================================
    {
        "template_id": "in_scam_lottery_cashback_0",
        "category": "lottery_cashback",
        "template": (
            "CONGRATULATIONS! Your mobile number has won Rs.{amount} in the KBC Lucky Draw. "
            "Claim before {date}: {link}  Helpline: {phone}"
        ),
    },
    {
        "template_id": "in_scam_lottery_cashback_1",
        "category": "lottery_cashback",
        "template": (
            "Dear {name}, Google India is giving Rs.{amount} cashback to 100 lucky users. "
            "You are selected! Collect at {link} — today only."
        ),
    },
    {
        "template_id": "in_scam_lottery_cashback_2",
        "category": "lottery_cashback",
        "template": (
            "आपने Rs.{amount} का इनाम जीता है! "
            "पाने के लिए यहाँ क्लिक करें: {link} — ऑफर {date} तक।"
        ),
    },
    {
        "template_id": "in_scam_lottery_cashback_3",
        "category": "lottery_cashback",
        "template": (
            "Lucky winner! Your phone number selected in BSNL bumper prize. "
            "Prize amount Rs.{amount}. Pay processing fee Rs.{amount} to claim: {link}"
        ),
    },
    {
        "template_id": "in_scam_lottery_cashback_4",
        "category": "lottery_cashback",
        "template": (
            "Flipkart Big Sale Cashback: Rs.{amount} cashback aapke account mein transfer hoga. "
            "Confirm karein: {link}  Last date: {date}"
        ),
    },
    {
        "template_id": "in_scam_lottery_cashback_5",
        "category": "lottery_cashback",
        "template": (
            "PM Kisan scheme beneficiary selected. Rs.{amount} prize money released. "
            "To receive, verify Aadhaar at {link} and enter bank details."
        ),
    },
    {
        "template_id": "in_scam_lottery_cashback_6",
        "category": "lottery_cashback",
        "template": (
            "Your {bank} credit card has Rs.{amount} reward points expiring on {date}. "
            "Redeem now: {link} — enter CVV to confirm your identity."
        ),
    },

    # ====================================================================
    # 7. aadhaar_pan_update (7 templates)
    # ====================================================================
    {
        "template_id": "in_scam_aadhaar_pan_update_0",
        "category": "aadhaar_pan_update",
        "template": (
            "UIDAI Alert: Your Aadhaar card needs biometric update by {date}. "
            "Book appointment and pay Rs.{amount} at {link} or your Aadhaar will be deactivated."
        ),
    },
    {
        "template_id": "in_scam_aadhaar_pan_update_1",
        "category": "aadhaar_pan_update",
        "template": (
            "Income Tax Dept: Link your PAN with Aadhaar immediately. "
            "Penalty of Rs.{amount} applies after {date}. Update at {link}."
        ),
    },
    {
        "template_id": "in_scam_aadhaar_pan_update_2",
        "category": "aadhaar_pan_update",
        "template": (
            "प्रिय {name}, आपका Aadhaar {date} को निष्क्रिय हो जाएगा। "
            "अपडेट करें: {link} — अभी करें।"
        ),
    },
    {
        "template_id": "in_scam_aadhaar_pan_update_3",
        "category": "aadhaar_pan_update",
        "template": (
            "Dear {name}, your PAN card is temporarily suspended. "
            "To reactivate, share Aadhaar OTP with our executive at {phone} or visit {link}."
        ),
    },
    {
        "template_id": "in_scam_aadhaar_pan_update_4",
        "category": "aadhaar_pan_update",
        "template": (
            "NSDL: Your PAN-Aadhaar linking failed. Pay penalty fee Rs.{amount}: {link}  "
            "Deadline: {date}"
        ),
    },
    {
        "template_id": "in_scam_aadhaar_pan_update_5",
        "category": "aadhaar_pan_update",
        "template": (
            "Aadhaar update karna hai? Ghar bethe update karein. "
            "OTP share karein {phone} pe — bilkul free service."
        ),
    },
    {
        "template_id": "in_scam_aadhaar_pan_update_6",
        "category": "aadhaar_pan_update",
        "template": (
            "Your DigiLocker Aadhaar document needs re-verification. "
            "Complete at {link} by {date} using your mobile OTP to avoid suspension."
        ),
    },

    # ====================================================================
    # 8. loan_offer (7 templates)
    # ====================================================================
    {
        "template_id": "in_scam_loan_offer_0",
        "category": "loan_offer",
        "template": (
            "Pre-approved personal loan of Rs.{amount} for you! "
            "No documents, instant disbursal. Pay processing fee Rs.999 at {link}."
        ),
    },
    {
        "template_id": "in_scam_loan_offer_1",
        "category": "loan_offer",
        "template": (
            "Dear {name}, your loan application of Rs.{amount} is approved. "
            "Pay insurance premium Rs.{amount} to release funds. Contact: {phone}"
        ),
    },
    {
        "template_id": "in_scam_loan_offer_2",
        "category": "loan_offer",
        "template": (
            "Instant loan Rs.{amount} — sirf {phone} pe WhatsApp karo. "
            "CIBIL score nahi chahiye. Disbursal 30 min mein."
        ),
    },
    {
        "template_id": "in_scam_loan_offer_3",
        "category": "loan_offer",
        "template": (
            "Rs.{amount} का लोन तुरंत पाएं। "
            "Apply: {link} — आज ही approve होगा। GST deposit: Rs.{amount}"
        ),
    },
    {
        "template_id": "in_scam_loan_offer_4",
        "category": "loan_offer",
        "template": (
            "Bajaj/HDFC Finance: You are eligible for Rs.{amount} loan at 0% interest. "
            "Send PAN & Aadhaar to {phone} and pay token Rs.{amount} to {link}."
        ),
    },
    {
        "template_id": "in_scam_loan_offer_5",
        "category": "loan_offer",
        "template": (
            "Business loan Rs.{amount} without collateral approved. "
            "Transfer refundable security deposit first: {link}  Helpline: {phone}"
        ),
    },
    {
        "template_id": "in_scam_loan_offer_6",
        "category": "loan_offer",
        "template": (
            "Student education loan Rs.{amount} approved by government scheme. "
            "Pay stamp duty Rs.{amount} to release: {link}  Last date {date}."
        ),
    },

    # ====================================================================
    # 5b. job_task_scam — 6 more templates (k 7–12)
    # ====================================================================
    {
        "template_id": "in_scam_job_task_scam_7",
        "category": "job_task_scam",
        "template": (
            "Dear {name}, earn Rs.{amount} weekly by rating hotel rooms online. "
            "One-time activation fee Rs.499. Register: {link}  Support: {phone}"
        ),
    },
    {
        "template_id": "in_scam_job_task_scam_8",
        "category": "job_task_scam",
        "template": (
            "Crypto trading se Rs.{amount} roz kamao. "
            "Sirf {phone} pe join karo aur pehle task mein hi paise wapas milenge."
        ),
    },
    {
        "template_id": "in_scam_job_task_scam_9",
        "category": "job_task_scam",
        "template": (
            "आपको Amazon product review likhne ke liye Rs.{amount} milenge. "
            "Abhi join karein: {link} — pehle Rs.{amount} deposit karein."
        ),
    },
    {
        "template_id": "in_scam_job_task_scam_10",
        "category": "job_task_scam",
        "template": (
            "Part-time Instagram influencer job. Follow & like pages, earn Rs.{amount}/hr. "
            "No experience needed. Pay joining fee {link}. Call: {phone}"
        ),
    },
    {
        "template_id": "in_scam_job_task_scam_11",
        "category": "job_task_scam",
        "template": (
            "{name} ji, aapka application select hua hai data analyst internship ke liye. "
            "Rs.{amount} stipend per month. Pehle training kit fee Rs.1499 bharein: {link}"
        ),
    },
    {
        "template_id": "in_scam_job_task_scam_12",
        "category": "job_task_scam",
        "template": (
            "Online survey complete karo aur Rs.{amount} paao directly UPI mein. "
            "Join karo: {link}  Registration: Rs.{amount}"
        ),
    },

    # ====================================================================
    # 9. digital_arrest  (10 templates)
    # ====================================================================
    {
        "template_id": "in_scam_digital_arrest_0",
        "category": "digital_arrest",
        "template": (
            "This is Officer {name} from CBI Cybercrime Division. "
            "Your Aadhaar has been linked to a money laundering case. "
            "You are under digital arrest. Do NOT leave home. Call {phone} immediately."
        ),
    },
    {
        "template_id": "in_scam_digital_arrest_1",
        "category": "digital_arrest",
        "template": (
            "TRAI Notice: Your mobile number will be disconnected in 2 hours "
            "due to illegal activities registered against it. "
            "Press 9 to speak with our officer or call {phone}."
        ),
    },
    {
        "template_id": "in_scam_digital_arrest_2",
        "category": "digital_arrest",
        "template": (
            "Aapke naam pe ek parcel seized hua hai jisme drugs mile hain. "
            "CBI officer se baat karein: {phone} — warna arrest warrant jayega. "
            "Abhi call karein, case close karne ka mauka sirf aaj hai."
        ),
    },
    {
        "template_id": "in_scam_digital_arrest_3",
        "category": "digital_arrest",
        "template": (
            "आपके Aadhaar का उपयोग करके एक बैंक खाता खोला गया है "
            "जिसमें Rs.{amount} की काली कमाई पाई गई। "
            "ED अधिकारी से तुरंत संपर्क करें: {phone} — अन्यथा गिरफ्तारी होगी।"
        ),
    },
    {
        "template_id": "in_scam_digital_arrest_4",
        "category": "digital_arrest",
        "template": (
            "Supreme Court summons issued against you. Case no: {amount}. "
            "Your bank accounts will be frozen within 24 hrs. "
            "To settle out of court pay compliance bond Rs.{amount}: {link}"
        ),
    },
    {
        "template_id": "in_scam_digital_arrest_5",
        "category": "digital_arrest",
        "template": (
            "IPS Officer speaking. Your number flagged in narcotics racket. "
            "Video call hoga abhi — camera band mat karna. "
            "Bail bond Rs.{amount} pay karo: {link}  Case: {phone}"
        ),
    },
    {
        "template_id": "in_scam_digital_arrest_6",
        "category": "digital_arrest",
        "template": (
            "Dear {name}, Mumbai Police Cybercell has lodged FIR against your number "
            "for sending obscene messages. Report online within 2 hours: {link} "
            "or face immediate arrest. Officer helpline: {phone}"
        ),
    },
    {
        "template_id": "in_scam_digital_arrest_7",
        "category": "digital_arrest",
        "template": (
            "Interpol alert: Your IP address traced to cybercrime activity. "
            "International arrest warrant issued. "
            "Pay settlement amount Rs.{amount} at {link} to avoid extradition."
        ),
    },
    {
        "template_id": "in_scam_digital_arrest_8",
        "category": "digital_arrest",
        "template": (
            "Aapke naam se 14 SIM cards activate hain jo fraud mein use ho rahe hain. "
            "DoT ke anusar aapka number 4 ghante mein band ho jayega. "
            "Turant {phone} pe call karein aur compliance fee bharein: {link}"
        ),
    },
    {
        "template_id": "in_scam_digital_arrest_9",
        "category": "digital_arrest",
        "template": (
            "आपके खिलाफ साइबर अपराध की FIR दर्ज हुई है। "
            "गिरफ्तारी से बचने के लिए Rs.{amount} की जमानत राशि जमा करें: {link} "
            "— अधिकारी का नंबर: {phone}"
        ),
    },

    # ====================================================================
    # 10. investment_trading  (10 templates)
    # ====================================================================
    {
        "template_id": "in_scam_investment_trading_0",
        "category": "investment_trading",
        "template": (
            "Exclusive stock tip: Buy XYZ shares now, guaranteed 300% return in 30 days. "
            "Join our Telegram VIP group. Initial investment Rs.{amount}. "
            "Register: {link}  WhatsApp: {phone}"
        ),
    },
    {
        "template_id": "in_scam_investment_trading_1",
        "category": "investment_trading",
        "template": (
            "Dear {name}, our algo-trading bot has generated Rs.{amount} profit for members this week. "
            "Invest Rs.{amount} and double it in 7 days. Limited slots. Join: {link}"
        ),
    },
    {
        "template_id": "in_scam_investment_trading_2",
        "category": "investment_trading",
        "template": (
            "Crypto mein invest karo, 200% return guaranteed. "
            "Hamara expert team daily profit deta hai. "
            "Sirf {phone} pe message karo aur Rs.{amount} se shuru karo."
        ),
    },
    {
        "template_id": "in_scam_investment_trading_3",
        "category": "investment_trading",
        "template": (
            "शेयर बाज़ार में Rs.{amount} लगाओ और महीने में Rs.{amount} कमाओ। "
            "SEBI रजिस्टर्ड advisor (झूठा दावा)। "
            "अभी join करें: {link}"
        ),
    },
    {
        "template_id": "in_scam_investment_trading_4",
        "category": "investment_trading",
        "template": (
            "International forex trading platform: Earn $500 daily. "
            "Deposit Rs.{amount} in our wallet, withdraw anytime. "
            "Proof of earnings: {link}  Agent: {phone}"
        ),
    },
    {
        "template_id": "in_scam_investment_trading_5",
        "category": "investment_trading",
        "template": (
            "{name} ji, hamare IPO advisory se 15 logon ne last month Rs.{amount} kamaye. "
            "Aap bhi join karo. Membership fee sirf Rs.{amount}: {link}"
        ),
    },
    {
        "template_id": "in_scam_investment_trading_6",
        "category": "investment_trading",
        "template": (
            "Gold trading se roz Rs.{amount} kamao. No loss strategy. "
            "Download our app: {link} and invest minimum Rs.{amount}. "
            "Proof available. Call {phone}."
        ),
    },
    {
        "template_id": "in_scam_investment_trading_7",
        "category": "investment_trading",
        "template": (
            "सरकारी बॉन्ड में निवेश करें और 40% वार्षिक ब्याज पाएं। "
            "Rs.{amount} से शुरू करें। यह ऑफर सिर्फ {date} तक है। "
            "संपर्क: {phone} या {link}"
        ),
    },
    {
        "template_id": "in_scam_investment_trading_8",
        "category": "investment_trading",
        "template": (
            "Mutual fund withdrawal scam: Your SIP of Rs.{amount} is matured. "
            "Pay 2% TDS fee Rs.{amount} at {link} to release your funds. "
            "Contact our executive: {phone}"
        ),
    },
    {
        "template_id": "in_scam_investment_trading_9",
        "category": "investment_trading",
        "template": (
            "NFT aur crypto investment se {name} ne Rs.{amount} kamaye sirf 10 din mein. "
            "Aap bhi yeh mauka mat chhodein. Platform: {link}  Guide: {phone}"
        ),
    },

    # ====================================================================
    # 11. sextortion_threat  (8 templates — no explicit content)
    # ====================================================================
    {
        "template_id": "in_scam_sextortion_threat_0",
        "category": "sextortion_threat",
        "template": (
            "We have recorded your private video from your camera. "
            "Pay Rs.{amount} to {link} within 48 hours "
            "or we will share this video with all your contacts and post it online."
        ),
    },
    {
        "template_id": "in_scam_sextortion_threat_1",
        "category": "sextortion_threat",
        "template": (
            "Tumhari ek recording hamare paas hai jo tumhare dosto aur family ko bhej denge. "
            "Rs.{amount} bhejo {phone} pe abhi — baad mein mauka nahi milega."
        ),
    },
    {
        "template_id": "in_scam_sextortion_threat_2",
        "category": "sextortion_threat",
        "template": (
            "हमारे पास आपका एक निजी वीडियो है। "
            "यदि आप Rs.{amount} {link} पर नहीं भेजते, "
            "तो हम इसे आपके सभी WhatsApp contacts को भेज देंगे।"
        ),
    },
    {
        "template_id": "in_scam_sextortion_threat_3",
        "category": "sextortion_threat",
        "template": (
            "Dear {name}, your device was hacked 3 weeks ago. "
            "We have access to your camera and private files. "
            "Transfer Rs.{amount} to {link} or your video goes public tonight."
        ),
    },
    {
        "template_id": "in_scam_sextortion_threat_4",
        "category": "sextortion_threat",
        "template": (
            "Ek video call ke dauran aapki recording ho gayi. "
            "Humne yeh aapke Facebook friends list ko bhejna shuru kar diya. "
            "Rokne ke liye Rs.{amount} turant {phone} pe bhejo."
        ),
    },
    {
        "template_id": "in_scam_sextortion_threat_5",
        "category": "sextortion_threat",
        "template": (
            "Your intimate video is in our possession. We are serious. "
            "Rs.{amount} in Bitcoin via {link} is all it takes to delete everything permanently. "
            "You have 24 hours. Do not contact police."
        ),
    },
    {
        "template_id": "in_scam_sextortion_threat_6",
        "category": "sextortion_threat",
        "template": (
            "हमने आपके फोन का कैमरा एक्सेस किया था। "
            "आपकी रिकॉर्डिंग वायरल हो जाएगी अगर Rs.{amount} नहीं भेजे। "
            "जल्दी करें: {link}"
        ),
    },
    {
        "template_id": "in_scam_sextortion_threat_7",
        "category": "sextortion_threat",
        "template": (
            "{name}, think carefully. We have compromising material from your device. "
            "Your employer and relatives will receive it on {date} unless you pay Rs.{amount}. "
            "Payment link: {link}"
        ),
    },

    # ====================================================================
    # 12. fake_customer_care  (8 templates)
    # ====================================================================
    {
        "template_id": "in_scam_fake_customer_care_0",
        "category": "fake_customer_care",
        "template": (
            "Dear {name}, this is {bank} customer support. "
            "We detected suspicious login on your account. "
            "Install AnyDesk app and share the 9-digit code with our agent at {phone} to secure your account."
        ),
    },
    {
        "template_id": "in_scam_fake_customer_care_1",
        "category": "fake_customer_care",
        "template": (
            "Amazon customer care: Your order refund of Rs.{amount} is stuck. "
            "To process, share the OTP you receive with our executive {phone}. "
            "Or pay a small verification fee of Rs.{amount}: {link}"
        ),
    },
    {
        "template_id": "in_scam_fake_customer_care_2",
        "category": "fake_customer_care",
        "template": (
            "Bijli vibhag customer care bol raha hoon. "
            "Aapka meter faulty hai, update ke liye AnyDesk install karo "
            "aur code share karo {phone} pe. Bilkul free service hai."
        ),
    },
    {
        "template_id": "in_scam_fake_customer_care_3",
        "category": "fake_customer_care",
        "template": (
            "आपका {bank} डेबिट कार्ड ब्लॉक हो गया है। "
            "ग्राहक सेवा अधिकारी से बात करें: {phone} "
            "— अनब्लॉक के लिए OTP और कार्ड नंबर साझा करें।"
        ),
    },
    {
        "template_id": "in_scam_fake_customer_care_4",
        "category": "fake_customer_care",
        "template": (
            "Paytm support here. Your KYC is pending and wallet is frozen. "
            "To unfreeze, pay a nominal fee Rs.{amount} at {link} "
            "or call our agent {phone} and share your registered OTP."
        ),
    },
    {
        "template_id": "in_scam_fake_customer_care_5",
        "category": "fake_customer_care",
        "template": (
            "FedEx India care: Your parcel delivery failed. "
            "Pay re-delivery charge Rs.{amount} here: {link} "
            "Or speak to agent {phone} who will guide you step by step."
        ),
    },
    {
        "template_id": "in_scam_fake_customer_care_6",
        "category": "fake_customer_care",
        "template": (
            "Airtel helpdesk: Net issue report receive hua. "
            "Hamara technician remotely fix karega — AnyDesk download karo "
            "aur {phone} pe 6-digit code batao. Koi charge nahi."
        ),
    },
    {
        "template_id": "in_scam_fake_customer_care_7",
        "category": "fake_customer_care",
        "template": (
            "RBI helpline: Aapka {bank} account suspicious transaction ki wajah se block hua. "
            "Rs.{amount} security deposit karein {link} pe account restore ke liye. "
            "Officer helpline: {phone}"
        ),
    },
]
