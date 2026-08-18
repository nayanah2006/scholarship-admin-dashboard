import React, { useState, useMemo } from 'react';
import {
  LayoutDashboard,
  BarChart3,
  FileText,
  Lightbulb,
  Bell,
  Download,
  Filter,
  Search,
  Grid,
  List,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Building2,
  GraduationCap,
  School,
  BookOpen,
  PieChart,
  Megaphone,
  CheckSquare,
  FileCheck
} from 'lucide-react';

// ==========================================
// DYNAMIC PORTAL DATASTORE
// ==========================================
const districtCatalog = [
  {
    name: "Bengaluru Urban",
    code: "101",
    instCount: "2,410",
    regCount: "452,103",
    approvedCount: "398,401",
    pendingCount: "53,702",
    coverage: 88,
    categoryMeta: [
      { id: "schools", name: "Schools", sub: "Primary & Secondary Education", total: 1432, students: "425k", approved: "284,102", rate: "82.4%", badge: "+2.1%", badgeColor: "bg-emerald-50 text-emerald-600", icon: School },
      { id: "pu", name: "Pre-University Colleges", sub: "Vocational & Junior Colleges", total: 648, students: "186k", approved: "142,509", rate: "75.1%", badge: "-0.5%", badgeColor: "bg-red-50 text-red-600", icon: BookOpen },
      { id: "univ", name: "Universities", sub: "Undergraduate & Tech Studies", total: 82, students: "312k", approved: "198,334", rate: "90.2%", badge: "+5.4%", badgeColor: "bg-emerald-50 text-emerald-600", icon: GraduationCap },
      { id: "pg", name: "Postgraduate Institutions", sub: "Masters, Doctoral & Research", total: 124, students: "45k", approved: "32,110", rate: "62.8%", badge: "STABLE", badgeColor: "bg-slate-100 text-slate-600", icon: Building2 },
    ],
    institutions: {
      pu: [
        "Government PU College, Jayanagar","St. Joseph's Pre-University College","Seshadripuram PU College, Yelahanka","Mount Carmel Pre-University College","Vijaya PU College, Basavanagudi","Narayana PU College, Indiranagar","Mallya PU College, MG Road","Jain PU College, Kormangala","Bishop Cotton PU College, Bengaluru","Christ Junior College, Bengaluru","Vivekananda PU College, Rajajinagar","KLE Independent PU College, Jayanagar","DPS Pre-University College, Bengaluru","Shree Vidyanikethan PU College, Whitefield","National Public School PU College, Koramangala"
      ],
      schools: [
        "Government High School, Malleshwaram","National High School, Basavanagudi","St. Mary's High School, Indiranagar","Bishop Cotton Girls' High School","SFS High School, Yelachenahalli","Vijaya High School, Jayanagar","Delhi Public School, Bengaluru","Treamis World School, HSR Layout","Ryan International School, Bellandur","Mallya Aditi International School","Kendriya Vidyalaya, Jalahalli","Carmel High School, Banaswadi","Mount Litera Zee School, Electronic City","Greenwood High School, Sarjapur","Indus International School, Bengaluru"
      ],
      univ: [
        "Bangalore University, Jnana Bharathi","University of Agricultural Sciences, GKVK","NITTE University, Bengaluru","Christ University, Bengaluru","RV University, Bengaluru","Azim Premji University, Bengaluru","Symbiosis Institute of Business Management, Bengaluru","Indian Institute of Science (IISc)","National Law School of India University","MS Ramaiah University of Applied Sciences","Manipal Academy of Higher Education, Bengaluru","Presidency University, Bengaluru","Alliance University, Bengaluru","REVA University, Bengaluru","St. Joseph's University, Bengaluru"
      ],
      pg: [
        "Indian Institute of Science (IISc)","Institute for Social and Economic Change","National Institute of Advanced Studies","Raman Research Institute","C.M.R. Institute of Management Studies","School of Planning and Architecture, Bengaluru","Tata Institute of Social Sciences, Bengaluru","NLSIU Research Centre","IIM Bangalore","Jain University Centre for Management Studies","Bangalore Medical College Research Centre","M.S. Ramaiah Institute of Management","Christ University Research Center","Azim Premji University Research Center","JSS Academy of Higher Education, Bengaluru"
      ]
    }
  },
  {
    name: "Mysuru",
    code: "104",
    instCount: "1,120",
    regCount: "184,200",
    approvedCount: "152,400",
    pendingCount: "31,800",
    coverage: 76,
    categoryMeta: [
      { id: "schools", name: "Schools", sub: "Primary & Secondary Education", total: 680, students: "110k", approved: "92,100", rate: "83.7%", badge: "+1.2%", badgeColor: "bg-emerald-50 text-emerald-600", icon: School },
      { id: "pu", name: "Pre-University Colleges", sub: "Vocational & Junior Colleges", total: 310, students: "45k", approved: "38,200", rate: "84.8%", badge: "+3.1%", badgeColor: "bg-emerald-50 text-emerald-600", icon: BookOpen },
      { id: "univ", name: "Universities", sub: "Undergraduate & Tech Studies", total: 24, students: "82k", approved: "68,400", rate: "83.4%", badge: "+0.8%", badgeColor: "bg-emerald-50 text-emerald-600", icon: GraduationCap },
      { id: "pg", name: "Postgraduate Institutions", sub: "Masters, Doctoral & Research", total: 42, students: "18k", approved: "14,200", rate: "78.8%", badge: "+1.5%", badgeColor: "bg-emerald-50 text-emerald-600", icon: Building2 },
    ],
    institutions: {
      pu: [
        "Maharanis PU College for Women, Mysuru","Marimallappa PU College, Mysuru","Maharaja's College PU Section","GSSS PU College, Mysuru","JSS PU College, Mysuru","Mysore Public School PU College","Karnataka State PU College, Krishnaraja","Vijaya PU College, Mysuru","Sharada PU College, Nanjangud","Sadvidya PU College, Mysuru","Mysore Indian Education Society PU College","Nirmala PU College, Mysuru","St. Philomena's PU College, Mysuru","Aishwarya PU College, Chamarajanagar","Bharathi PU College, Mysuru"
      ],
      schools: [
        "JSS High School, Mysuru","Marimallappa High School","St. Joseph's School, Mysuru","Vivekananda School, Mysuru","Davanagere Kannada Medium School","SVM School, Nanjangud","Bharathi Vidya Mandir, Mysuru","Mysore Public School","BGS International School, Mysuru","Lalbhag School, Mysuru","Sri Aurobindo Memorial School","The Learning Hub, Mysuru","Kendriya Vidyalaya, Mysuru","NPS School, Mysuru","Mount Carmel School, Mysuru"
      ],
      univ: [
        "University of Mysore","Mysore Medical College and Research Institute","JSS Academy of Higher Education & Research","Maharaja's College, Mysuru","Yadavanahalli Institute of Management","Sri Jayachamarajendra College of Engineering","Mysuru University PG Centre","N. G. P. College of Engineering, Mysuru","Vidyavardhaka College of Engineering","LEAD College of Management, Mysuru","Mysore School of Architecture","Ramaiah Institute of Excellence, Mysuru","CMS Business School, Mysuru","Maharaja Institute of Technology, Mysuru","JSS Science and Technology University"
      ],
      pg: [
        "University of Mysore PG Centre","JSS Pharmacy College","JSS Dental College and Hospital","Mysore Medical College PG Centre","Research Centre, Vignana Bharathi","Mysore Institute of Medical Sciences Research Unit","Mysore School of Design","JSS Institute of Economics Studies","JSS Business School","Mysore College of Engineering Research Centre","Ramaiah Advanced Learning Centre, Mysuru","Mysore Institute of Technology Research Wing","Bharathair University Satellite Centre","Mysore Geology and Environmental Research Centre","Karnataka State Open University Mysuru Centre"
      ]
    }
  },
  {
    name: "Belagavi",
    code: "112",
    instCount: "1,450",
    regCount: "212,800",
    approvedCount: "168,400",
    pendingCount: "44,400",
    coverage: 82,
    categoryMeta: [
      { id: "schools", name: "Schools", sub: "Primary & Secondary Education", total: 890, students: "130k", approved: "105,000", rate: "80.7%", badge: "+0.4%", badgeColor: "bg-emerald-50 text-emerald-600", icon: School },
      { id: "pu", name: "Pre-University Colleges", sub: "Vocational & Junior Colleges", total: 420, students: "58k", approved: "44,100", rate: "76.0%", badge: "-1.2%", badgeColor: "bg-red-50 text-red-600", icon: BookOpen },
      { id: "univ", name: "Universities", sub: "Undergraduate & Tech Studies", total: 18, students: "46k", approved: "34,100", rate: "74.0%", badge: "+1.1%", badgeColor: "bg-emerald-50 text-emerald-600", icon: GraduationCap },
      { id: "pg", name: "Postgraduate Institutions", sub: "Masters, Doctoral & Research", total: 22, students: "12k", approved: "9,100", rate: "76.4%", badge: "+0.8%", badgeColor: "bg-emerald-50 text-emerald-600", icon: Building2 },
    ],
    institutions: {
      pu: [
        "RLS Pre-University College, Belagavi","KLE Independent PU College, Belagavi","Shree Ram PU College, Gokak","S B C PU College, Belagavi","Sangam PU College, Athani","S K Shinde PU College, Khanapur","Anjuman PU College, Belagavi","Basaveshwar PU College, Belagavi","KLE PU College, Chikodi","Govt Junior College, Belagavi","Vikas PU College, Bailhongal","Nutan PU College, Hukkeri","St. Mary's PU College, Belagavi","Sophia PU College, Belagavi","Himalaya PU College, Belagavi"
      ],
      schools: [
        "Government High School, Belagavi","St. Xavier's School, Belagavi","KLE School, Belagavi","Bishop School, Belagavi","Chikkodi English School","Belagavi Public School","Gateway School, Gokak","Shanti Niketan School, Belagavi","Kendriya Vidyalaya, Belagavi","Bharatiya Vidya Bhavan, Belagavi","Saraswati School, Bailhongal","Navodaya School, Belagavi","Mahatma Gandhi School, Athani","RNS School, Belagavi","Panchayat School, Hukkeri"
      ],
      univ: [
        "KLE Technological University, Hubballi","KLE College of Engineering, Belagavi","Rajiv Gandhi University of Health Sciences Satellite Centre","Vijayanagar College, Belagavi","Gogte Institute of Technology, Belagavi","BGM Institute of Technology, Belagavi","KLE's Law College, Belagavi","Belagavi Institute of Medical Sciences","KLE's College of Pharmacy, Belagavi","Sai College, Belagavi","Shri B.M. Patil Institute, Belagavi","Sardar Patel College of Education, Belagavi","Maharashtra Mandal Arts College, Belagavi","Basaveshwar Arts College, Belagavi","KLE College of Nursing, Belagavi"
      ],
      pg: [
        "KLE's PG Centre, Belagavi","BGM PG College, Belagavi","Sangameshwar PG College, Belagavi","Gokak PG Study Centre","Belagavi School of Management Studies","KLE Research Institute, Belagavi","Belagavi Institute of Advanced Studies","PG Studies, RLS College, Belagavi","Hubballi-Belagavi Regional PG Centre","Shivaji University Centre, Belagavi","Institute of Social Work, Belagavi","Belagavi Management Research Centre","Belagavi Polytechnic PG Extension","Technology Innovation Hub, Belagavi","Research and Training Centre, Belagavi"
      ]
    }
  },
  {
    name: "Hubballi-Dharwad",
    code: "118",
    instCount: "890",
    regCount: "125,400",
    approvedCount: "108,200",
    pendingCount: "17,200",
    coverage: 86,
    categoryMeta: [
      { id: "schools", name: "Schools", sub: "Primary & Secondary Education", total: 520, students: "74k", approved: "60,200", rate: "81.4%", badge: "+1.4%", badgeColor: "bg-emerald-50 text-emerald-600", icon: School },
      { id: "pu", name: "Pre-University Colleges", sub: "Junior Colleges", total: 240, students: "35k", approved: "29,100", rate: "83.1%", badge: "+2.0%", badgeColor: "bg-emerald-50 text-emerald-600", icon: BookOpen },
      { id: "univ", name: "Universities", sub: "Undergraduate & Tech Studies", total: 17, students: "39k", approved: "33,800", rate: "86.7%", badge: "+2.5%", badgeColor: "bg-emerald-50 text-emerald-600", icon: GraduationCap },
      { id: "pg", name: "Postgraduate Institutions", sub: "Masters, Doctoral & Research", total: 19, students: "8k", approved: "6,300", rate: "79.0%", badge: "+1.0%", badgeColor: "bg-emerald-50 text-emerald-600", icon: Building2 },
    ],
    institutions: {
      pu: [
        "Kittel Junior College, Dharwad","BVB PU College, Hubballi","GSS PU College, Hubballi","RNS PU College, Dharwad","SDA PU College, Hubballi","Shree Venkatesh PU College, Hubballi","Gurukul PU College, Dharwad","Vikas PU College, Hubballi","Nehru PU College, Dharwad","Basaveshwar PU College, Hubballi","Sambhaji PU College, Dharwad","Jain PU College, Hubballi","Mahatma Gandhi PU College, Dharwad","S K PU College, Hubballi","Karnataka Public School PU College, Hubballi"
      ],
      schools: [
        "Kendriya Vidyalaya, Hubballi","The New Cambridge School, Dharwad","Gokak School, Hubballi","Dharwad Public School","Mahila School, Hubballi","Anjuman School, Hubballi","Jain International School, Dharwad","KLE School, Hubballi","Vivekananda School, Hubballi","Nutan School, Dharwad","Sadhana School, Dharwad","Gandhi School, Hubballi","Cambridge School, Hubballi","Kumaran School, Dharwad","Karnataka School, Hubballi"
      ],
      univ: [
        "KLE Technological University, Hubballi","SDM College of Engineering and Technology, Dharwad","BVB College of Engineering and Technology, Hubballi","College of Engineering, Dharwad","NITTE Institute of Technology, Hubballi","Dharwad Institute of Mental Health & Neurosciences","Karnatak University, Dharwad","Jain College of Engineering, Hubballi","Institute of Engineering and Technology, Dharwad","S.D.M. Ayurvedic College, Dharwad","PES College of Engineering, Hubballi","KLE's Jagadguru Gangadhar Mahaswamigalu College of Engineering","Dharwad School of Business","Vishweshwaraya College, Hubballi","Sahyadri College of Engineering, Hubballi"
      ],
      pg: [
        "Karnatak University PG Centre, Dharwad","KLE PG Centre, Hubballi","Institute of Engineering and Technology PG Centre","Dharwad Management College","BVB PG College, Hubballi","Research Centre, SDM College","PG College of Commerce, Dharwad","KLE Senior Research Wing, Hubballi","Hubballi Medical College Research Institute","PG Studies, BVB, Hubballi","University Business School, Dharwad","Advanced Materials Research Centre, Hubballi","Dharwad Social Science PG Centre","KLE School of Advanced Research","Hubballi Centre for Applied Science"
      ]
    }
  },
  {
    name: "Mangaluru",
    code: "125",
    instCount: "740",
    regCount: "98,200",
    approvedCount: "89,500",
    pendingCount: "8,700",
    coverage: 91,
    categoryMeta: [
      { id: "schools", name: "Schools", sub: "Primary & Secondary Education", total: 410, students: "52k", approved: "48,100", rate: "92.1%", badge: "+3.3%", badgeColor: "bg-emerald-50 text-emerald-600", icon: School },
      { id: "pu", name: "Pre-University Colleges", sub: "Junior Colleges", total: 180, students: "28k", approved: "25,400", rate: "90.7%", badge: "+4.1%", badgeColor: "bg-emerald-50 text-emerald-600", icon: BookOpen },
      { id: "univ", name: "Universities", sub: "Undergraduate & Tech Studies", total: 11, students: "26k", approved: "24,800", rate: "95.0%", badge: "+4.5%", badgeColor: "bg-emerald-50 text-emerald-600", icon: GraduationCap },
      { id: "pg", name: "Postgraduate Institutions", sub: "Masters, Doctoral & Research", total: 13, students: "6k", approved: "5,700", rate: "95.0%", badge: "+4.1%", badgeColor: "bg-emerald-50 text-emerald-600", icon: Building2 },
    ],
    institutions: {
      pu: [
        "St. Aloysius PU College, Mangaluru","Canara College PU Section, Mangaluru","Mahatma Gandhi PU College, Mangaluru","Milagres PU College, Mangaluru","Besant Women's PU College, Mangaluru","Nethaji PU College, Mangaluru","PMS PU College, Mangaluru","Mother Teresa PU College, Mangaluru","S E S PU College, Mangaluru","St. Theresa's PU College, Mangaluru","Gurukula PU College, Mangaluru","Govt PU College, Bantwal","Mangaluru Educational Society PU College","Yenepoya PU College, Mangaluru","Bhandarkar's PU College, Mangaluru"
      ],
      schools: [
        "St. Aloysius School, Mangaluru","Canara High School, Mangaluru","Milagres School, Mangaluru","Holy Family School, Mangaluru","Bishop's School, Mangaluru","St. Theresa's School, Mangaluru","S.D.M. School, Mangaluru","Vidyodaya School, Mangaluru","Mangaluru Public School","Kendriya Vidyalaya, Mangaluru","Sunrise International School, Puttur","N A P School, Mangaluru","Sharada School, Mangaluru","Iqra School, Mangaluru","R.M.V. School, Mangaluru"
      ],
      univ: [
        "Mangalore University","NITTE University, Mangaluru","St. Aloysius College, Mangaluru","Yenepoya University","Canara College, Mangaluru","Sahyadri College of Engineering & Management","AJ Institute of Engineering & Technology","Justice K.S. Hegde College of Engineering","P A College of Engineering, Mangaluru","Karnataka State Rural Development and Panchayat Raj University Centre","National Institute of Technology Karnataka Extension Centre","Mangaluru Institute of Technology & Engineering","Dr. M.V. Shetty Institute of Technology","Mahatma Gandhi Memorial College, Mangaluru","A J Institute of Management"
      ],
      pg: [
        "Mangalore University PG Centre","Yenepoya Medical College Research Centre","NITTE Postgraduate Campus, Mangaluru","St. Aloysius Postgraduate Centre","Mangaluru Business School","Sahyadri PG Centre","Canara College Research Wing","NITK Extension Research Hub","Mangaluru College of Law","PG Medical Research Centre, Mangaluru","Mangalore Institute of Management Studies","Mangaluru College of Arts PG Centre","Bishop Sequeira PG Centre","The Global Institute of Management Studies, Mangaluru","Mangaluru Research and Development Centre"
      ]
    }
  },
  {
    name: "Kalaburagi",
    code: "132",
    instCount: "1,210",
    regCount: "165,900",
    approvedCount: "112,400",
    pendingCount: "53,500",
    coverage: 68,
    categoryMeta: [
      { id: "schools", name: "Schools", sub: "Primary & Secondary Education", total: 760, students: "86k", approved: "55,200", rate: "64.0%", badge: "-2.4%", badgeColor: "bg-red-50 text-red-600", icon: School },
      { id: "pu", name: "Pre-University Colleges", sub: "Junior Colleges", total: 390, students: "48k", approved: "32,100", rate: "66.8%", badge: "-3.5%", badgeColor: "bg-red-50 text-red-600", icon: BookOpen },
      { id: "univ", name: "Universities", sub: "Undergraduate & Tech Studies", total: 9, students: "24k", approved: "15,200", rate: "63.3%", badge: "-1.8%", badgeColor: "bg-red-50 text-red-600", icon: GraduationCap },
      { id: "pg", name: "Postgraduate Institutions", sub: "Masters, Doctoral & Research", total: 11, students: "5k", approved: "3,500", rate: "70.0%", badge: "-1.4%", badgeColor: "bg-red-50 text-red-600", icon: Building2 },
    ],
    institutions: {
      pu: [
        "Government PU College, Kalaburagi","Sangameshwar PU College, Kalaburagi","Shri Shivaji PU College, Sedam","BSR PU College, Chitapur","Narayana PU College, Kalaburagi","Sadhana PU College, Yadgir","Vivekananda PU College, Kalaburagi","Jawahar PU College, Aland","Mahatma Gandhi PU College, Afzalpur","Shridevi PU College, Kalaburagi","M N College PU Section, Yadgir","Nirmala PU College, Kalaburagi","Shivam PU College, Gulbarga","Bharat PU College, Kalaburagi","Govt Model PU College, Kalaburagi"
      ],
      schools: [
        "Government High School, Kalaburagi","St. Francis School, Kalaburagi","Anjuman School, Kalaburagi","S V School, Gulbarga","Kendriya Vidyalaya, Kalaburagi","Akhila Bharatiya School, Kalaburagi","ZP High School, Sedam","Rural School, Afzalpur","Govt School, Chitapur","Saraswati High School, Kalaburagi","Bharat School, Kalaburagi","Jain Public School, Kalaburagi","Carmel School, Gulbarga","Shree Rama School, Yadgir","Maharashtra School, Kalaburagi"
      ],
      univ: [
        "Kalaburagi University","Gulbarga University PG Centre","Sharnbasva University, Kalaburagi","KBN College, Kalaburagi","Government Degree College, Kalaburagi","University College of Agriculture, Kalaburagi","A M College of Engineering, Kalaburagi","Vidhya Vardhaka College, Kalaburagi","Bharath Education Society College, Kalaburagi","Karnataka State Open University Centre, Kalaburagi","AL-Ameen College, Kalaburagi","St. Mary's Women College, Kalaburagi","Bheemanna Khandre Institute of Technology, Bhalki","M R M College, Kalaburagi","A.T. Model College, Kalaburagi"
      ],
      pg: [
        "Kalaburagi University PG Centre","Sharnbasva PG College, Kalaburagi","Government Medical College Research Centre","Nursing PG Centre, Kalaburagi","Sardar Patel PG Centre, Kalaburagi","Shivam Management PG Centre","Gulbarga Institute of Management Studies","Agriculture Research PG Centre, Kalaburagi","College of Education PG Centre, Kalaburagi","Ramkrishna College Advanced Studies","Institute of Social Sciences, Kalaburagi","Bharat Research Academy, Kalaburagi","University Research Centre, Kalaburagi","School of Applied Sciences, Kalaburagi","Community Development PG Centre, Kalaburagi"
      ]
    }
  },
  {
    name: "Tumakuru",
    code: "141",
    instCount: "1,680",
    regCount: "214,500",
    approvedCount: "182,300",
    pendingCount: "32,200",
    coverage: 84,
    categoryMeta: [
      { id: "schools", name: "Schools", sub: "Primary & Secondary Education", total: 930, students: "140k", approved: "116,600", rate: "83.3%", badge: "+2.2%", badgeColor: "bg-emerald-50 text-emerald-600", icon: School },
      { id: "pu", name: "Pre-University Colleges", sub: "Junior Colleges", total: 440, students: "63k", approved: "52,400", rate: "83.1%", badge: "+1.9%", badgeColor: "bg-emerald-50 text-emerald-600", icon: BookOpen },
      { id: "univ", name: "Universities", sub: "Undergraduate & Tech Studies", total: 18, students: "41k", approved: "35,200", rate: "85.8%", badge: "+2.6%", badgeColor: "bg-emerald-50 text-emerald-600", icon: GraduationCap },
      { id: "pg", name: "Postgraduate Institutions", sub: "Masters, Doctoral & Research", total: 20, students: "9k", approved: "7,200", rate: "80.0%", badge: "+1.1%", badgeColor: "bg-emerald-50 text-emerald-600", icon: Building2 },
    ],
    institutions: {
      pu: [
        "Government PU College, Tumakuru","S.S. PU College, Tumakuru","Nandini PU College, Tumakuru","Vivekananda PU College, Sira","Siddaganga PU College, Tumakuru","Carmel PU College, Tumakuru","Bharath PU College, Madhugiri","St. Joseph's PU College, Tumakuru","Gandhi PU College, Tiptur","Sri Kshetra PU College, Kunigal","Venkatesh PU College, Koratagere","Shivamogga PU Centre, Tumakuru","Narayana PU College, Tumakuru","GEC PU College, Tumakuru","KLE PU College, Tumakuru"
      ],
      schools: [
        "Government High School, Tumakuru","DPS Tumakuru","Navodaya School, Tumakuru","St. Mary's School, Tumakuru","Kendriya Vidyalaya, Tumakuru","Canara School, Tumakuru","Vivekananda School, Tumakuru","Carmel School, Tumakuru","Pioneer School, Madhugiri","SFS School, Tumakuru","Bharathi Vidya Mandir, Tiptur","Smt. Rukmini School, Tumakuru","Basava School, Tumakuru","Rural School, Sira","BGS School, Tumakuru"
      ],
      univ: [
        "Tumakuru University","Vivekananda Institute of Management, Tumakuru","Sri Siddhartha University, Tumakuru","Govt College of Engineering, Tumakuru","Tumakuru Medical College","BGS College of Engineering, Tumakuru","SJM Institute of Technology, Chitradurga","Maharaja Institute, Tumakuru","RNS Institute of Technology, Tumakuru","Nagegowda College, Tumakuru","Apex College, Tumakuru","Siddaganga Institute of Management, Tumakuru","Bharath Institute, Tumakuru","Madhugiri Degree College","Sira College of Arts & Science"
      ],
      pg: [
        "Tumakuru University PG Centre","Siddaganga Research Centre","Tumakuru Management Studies PG","Rural Health Research Centre, Tumakuru","Institute of Advanced Studies, Tumakuru","Sri Siddhartha Postgraduate College","Madhugiri PG Centre","BGS Business School, Tumakuru","University Research Centre, Tumakuru","Medical PG Research Wing, Tumakuru","Agriculture PG Centre, Tumakuru","Engineering PG Cell, Tumakuru","Technology Innovation Centre, Tumakuru","Education Research Institute, Tumakuru","Graduate School, Tumakuru"
      ]
    }
  },
  {
    name: "Shivamogga",
    code: "151",
    instCount: "1,420",
    regCount: "186,100",
    approvedCount: "152,700",
    pendingCount: "33,400",
    coverage: 80,
    categoryMeta: [
      { id: "schools", name: "Schools", sub: "Primary & Secondary Education", total: 860, students: "118k", approved: "98,100", rate: "83.1%", badge: "+1.7%", badgeColor: "bg-emerald-50 text-emerald-600", icon: School },
      { id: "pu", name: "Pre-University Colleges", sub: "Junior Colleges", total: 380, students: "56k", approved: "46,500", rate: "83.0%", badge: "+1.8%", badgeColor: "bg-emerald-50 text-emerald-600", icon: BookOpen },
      { id: "univ", name: "Universities", sub: "Undergraduate & Tech Studies", total: 15, students: "35k", approved: "29,800", rate: "85.1%", badge: "+2.4%", badgeColor: "bg-emerald-50 text-emerald-600", icon: GraduationCap },
      { id: "pg", name: "Postgraduate Institutions", sub: "Masters, Doctoral & Research", total: 18, students: "7k", approved: "5,900", rate: "84.3%", badge: "+1.4%", badgeColor: "bg-emerald-50 text-emerald-600", icon: Building2 },
    ],
    institutions: {
      pu: [
        "Government PU College, Shivamogga","Kuvempu PU College, Shivamogga","Sri Rama PU College, Shivamogga","RNS PU College, Bhadravati","JSS PU College, Shivamogga","Narayana PU College, Shivamogga","Maharaja PU College, Shivamogga","Sahyadri PU College, Shimoga","Mysore Public PU College, Shivamogga","Vivekananda PU College, Tirthahalli","St. Joseph's PU College, Shivamogga","Yashwanth PU College, Shivamogga","Karnataka PU College, Sagar","Bharathi PU College, Sorab","Rural PU College, Hosanagara"
      ],
      schools: [
        "Government High School, Shivamogga","Bishop School, Shivamogga","KS School, Shivamogga","Carmel School, Shivamogga","Navodaya School, Sagar","Kendriya Vidyalaya, Shivamogga","Shakuntala School, Shivamogga","Bharathi School, Bhadravati","Shivamogga Public School","Deepa School, Shivamogga","Vikasa School, Shimoga","Mysore Public School, Shivamogga","Aditi School, Tirthahalli","St. Mary's School, Shivamogga","Sahyadri School, Shivamogga"
      ],
      univ: [
        "Kuvempu University","Shivamogga Engineering College","Government College of Arts, Shivamogga","Mysore School of Management, Shivamogga","The National Institute of Ayurveda","Vivekananda Memorial College","Bhadravati Technology College","Sahyadri College, Shivamogga","JSS College, Shivamogga","Kuvempu University Centre, Sagar","Shivamogga College of Nursing","Green Valley College, Shivamogga","Jain College, Shivamogga","Siddaganga College, Shivamogga","Makenur Institute of Management"
      ],
      pg: [
        "Kuvempu University PG Centre","Shivamogga Research Institute","Bhadravati PG College","School of Economics, Shivamogga","Agriculture Research Center, Shivamogga","Management Studies PG Centre","Engineering Research Wing, Shivamogga","Medical PG Centre, Shivamogga","Education Research Institute, Shivamogga","Shivamogga Business School","Technology Innovation Lab, Shivamogga","Sahyadri Applied Science Centre","Art and Culture PG Centre, Shivamogga","Environmental Research Institute, Shivamogga","Regional PG Studies, Shivamogga"
      ]
    }
  },
  {
    name: "Raichur",
    code: "162",
    instCount: "1,090",
    regCount: "139,800",
    approvedCount: "101,600",
    pendingCount: "38,200",
    coverage: 72,
    categoryMeta: [
      { id: "schools", name: "Schools", sub: "Primary & Secondary Education", total: 760, students: "92k", approved: "66,500", rate: "72.2%", badge: "+0.7%", badgeColor: "bg-emerald-50 text-emerald-600", icon: School },
      { id: "pu", name: "Pre-University Colleges", sub: "Junior Colleges", total: 330, students: "44k", approved: "31,700", rate: "72.0%", badge: "-0.8%", badgeColor: "bg-red-50 text-red-600", icon: BookOpen },
      { id: "univ", name: "Universities", sub: "Undergraduate & Tech Studies", total: 10, students: "22k", approved: "16,100", rate: "73.2%", badge: "+1.2%", badgeColor: "bg-emerald-50 text-emerald-600", icon: GraduationCap },
      { id: "pg", name: "Postgraduate Institutions", sub: "Masters, Doctoral & Research", total: 12, students: "5k", approved: "3,600", rate: "72.0%", badge: "-0.4%", badgeColor: "bg-red-50 text-red-600", icon: Building2 },
    ],
    institutions: {
      pu: [
        "Government PU College, Raichur","Noble PU College, Raichur","GOPC PU College, Raichur","Shivaji PU College, Manvi","Azad PU College, Sindhnur","Bharathi PU College, Raichur","Mahatma Gandhi PU College, Lingsugur","Rural PU College, Devadurga","Karnataka PU College, Raichur","Narayana PU College, Raichur","Shree PU College, Raichur","Vivekananda PU College, Sindhnur","Rural Model College, Raichur","Saraswati PU College, Manvi","KLE PU College, Raichur"
      ],
      schools: [
        "Government High School, Raichur","Model School, Raichur","Kendriya Vidyalaya, Raichur","English Public School, Raichur","Rural School, Manvi","Shivaji School, Raichur","Gandhi School, Sindhnur","Sanjivani School, Raichur","Rural School, Devadurga","Little Angels School, Raichur","Mount Litera School, Raichur","Saraswati School, Manvi","Bharathi School, Raichur","Narayana School, Raichur","Govt School, Lingsugur"
      ],
      univ: [
        "Raichur University","Raichur Medical College","Government College of Arts, Raichur","College of Engineering, Raichur","Sindhnur Degree College","Manvi College of Science","Lingsugur College, Raichur","Rural Polytechnic College, Raichur","Community College, Raichur","Teachers Training Institute, Raichur","Gulbarga University Extension, Raichur","Seva College, Raichur","Bharath College, Raichur","Maitri Educational Centre, Raichur","Karnataka State Open University Centre, Raichur"
      ],
      pg: [
        "Raichur University PG Centre","Raichur Research Institute","Medical PG Centre, Raichur","Business School, Raichur","Education Research Wing, Raichur","Agriculture PG Centre, Raichur","Rural Development Centre, Raichur","University PG Studies, Raichur","Community Leadership Research Centre","Raichur Management Institute","Regional PG Studies, Raichur","Engineering PG Wing, Raichur","Social Science Research Unit, Raichur","Applied Research Centre, Raichur","Advanced Learning Institute, Raichur"
      ]
    }
  },
  {
    name: "Bidar",
    code: "173",
    instCount: "1,260",
    regCount: "147,600",
    approvedCount: "109,400",
    pendingCount: "38,200",
    coverage: 74,
    categoryMeta: [
      { id: "schools", name: "Schools", sub: "Primary & Secondary Education", total: 790, students: "95k", approved: "70,500", rate: "74.2%", badge: "+0.7%", badgeColor: "bg-emerald-50 text-emerald-600", icon: School },
      { id: "pu", name: "Pre-University Colleges", sub: "Junior Colleges", total: 350, students: "47k", approved: "34,400", rate: "73.2%", badge: "-0.2%", badgeColor: "bg-red-50 text-red-600", icon: BookOpen },
      { id: "univ", name: "Universities", sub: "Undergraduate & Tech Studies", total: 11, students: "23k", approved: "17,700", rate: "77.0%", badge: "+1.4%", badgeColor: "bg-emerald-50 text-emerald-600", icon: GraduationCap },
      { id: "pg", name: "Postgraduate Institutions", sub: "Masters, Doctoral & Research", total: 13, students: "6k", approved: "4,200", rate: "70.0%", badge: "+0.3%", badgeColor: "bg-emerald-50 text-emerald-600", icon: Building2 },
    ],
    institutions: {
      pu: [
        "Government PU College, Bidar","Anjuman PU College, Bidar","Shiva PU College, Bidar","Bharat PU College, Basavakalyan","Mahatma Gandhi PU College, Humnabad","Vivekananda PU College, Bidar","Asha PU College, Bidar","Model PU College, Aurad","Jagadguru PU College, Bidar","Kalyana PU College, Bidar","Rural PU College, Bhalki","Raghavendra PU College, Bidar","Narayana PU College, Bidar","Govt Composite PU College, Bidar","Haldar PU College, Bidar"
      ],
      schools: [
        "Government High School, Bidar","Saraswati School, Bidar","St. Xavier's School, Bidar","Kendriya Vidyalaya, Bidar","Little Star School, Bidar","Bharathi School, Basavakalyan","Maharaja School, Bidar","Mount Litera School, Bidar","Rural School, Humnabad","Public School, Aurad","Gandhi School, Bidar","Model School, Bidar","Modern School, Bidar","Navodaya School, Bidar","Shivam School, Bidar"
      ],
      univ: [
        "Bidar University","Bidar Medical College","Government Science College, Bidar","Rural College, Humnabad","Basavakalyan Degree College","Vivekananda Technical College, Bidar","Bidar Institute of Management","Community College, Bidar","Education College, Bidar","Amin College, Bidar","Shanti College, Bidar","Maa Sharada Arts College, Bidar","Chetana College, Bidar","Nadia College, Bidar","Humnabad Institute of Studies"
      ],
      pg: [
        "Bidar University PG Centre","Medical Research Centre, Bidar","Management Research Centre, Bidar","Education PG Centre, Bidar","Agriculture PG Centre, Bidar","Bidar Social Science Centre","Research Wing, Bidar","Engineering PG Centre, Bidar","Regional Studies Institute, Bidar","Rural Development Research Centre, Bidar","Basavakalyan PG Centre","Innovation Centre, Bidar","Technology Research Hub, Bidar","Law Studies PG Centre, Bidar","Public Policy Research Lab, Bidar"
      ]
    }
  },
  {
    name: "Davanagere",
    code: "184",
    instCount: "1,520",
    regCount: "195,300",
    approvedCount: "163,200",
    pendingCount: "32,100",
    coverage: 83,
    categoryMeta: [
      { id: "schools", name: "Schools", sub: "Primary & Secondary Education", total: 920, students: "126k", approved: "104,800", rate: "83.0%", badge: "+1.9%", badgeColor: "bg-emerald-50 text-emerald-600", icon: School },
      { id: "pu", name: "Pre-University Colleges", sub: "Junior Colleges", total: 410, students: "58k", approved: "48,200", rate: "83.0%", badge: "+1.7%", badgeColor: "bg-emerald-50 text-emerald-600", icon: BookOpen },
      { id: "univ", name: "Universities", sub: "Undergraduate & Tech Studies", total: 16, students: "33k", approved: "27,400", rate: "83.0%", badge: "+1.8%", badgeColor: "bg-emerald-50 text-emerald-600", icon: GraduationCap },
      { id: "pg", name: "Postgraduate Institutions", sub: "Masters, Doctoral & Research", total: 17, students: "8k", approved: "6,500", rate: "81.2%", badge: "+0.9%", badgeColor: "bg-emerald-50 text-emerald-600", icon: Building2 },
    ],
    institutions: {
      pu: [
        "Government PU College, Davanagere","JSS PU College, Davanagere","KLE PU College, Davanagere","St. Joseph's PU College, Davanagere","Vignana PU College, Harihar","Narayana PU College, Davanagere","Rayadurg PU College, Davanagere","Mahatma PU College, Davanagere","Bharath PU College, Channagiri","Sada PU College, Honnali","Vivekananda PU College, Davanagere","Karnataka PU College, Davanagere","Rural PU College, Jagalur","Sri Venkatesh PU College, Harihar","Govt. Model College, Davanagere"
      ],
      schools: [
        "Government High School, Davanagere","Kendriya Vidyalaya, Davanagere","JSS School, Davanagere","KLE School, Davanagere","St. Mary's School, Davanagere","Greenfield School, Davanagere","Bharathi School, Harihar","BGS School, Davanagere","Channagiri School, Davanagere","Aadya School, Davanagere","Vivekananda School, Davanagere","Sanjivani School, Honnali","Rural School, Jagalur","Anjuman School, Davanagere","Mahatma School, Davanagere"
      ],
      univ: [
        "Davanagere University","PES College, Davanagere","Government Engineering College, Davanagere","JNNCE Davanagere","Bapuji College of Engineering & Technology","Davanagere Medical College","JSS College of Arts, Commerce & Science","College of Education, Davanagere","Vijayanagar Academy, Davanagere","Shri Kshetra College, Davanagere","SJM College, Davanagere","Davanagere Law College","Nagarjuna Institute, Davanagere","Harihar College of Technology","Bharat Rural College, Davanagere"
      ],
      pg: [
        "Davanagere University PG Centre","JSS Research Institute, Davanagere","Medical PG Research Centre, Davanagere","Engineering PG Centre, Davanagere","JNNCE Postgraduate Center","Management Studies PG, Davanagere","Educational Research Wing, Davanagere","Agriculture Research Centre, Davanagere","Law PG Centre, Davanagere","Eco Science Research Hub, Davanagere","Business Analytics Center, Davanagere","Technology Innovation Lab, Davanagere","Rural Development PG Institute","Social Science Center, Davanagere","Advanced Learning Campus, Davanagere"
      ]
    }
  }
];

const portalData = Object.fromEntries(
  districtCatalog.map((district) => [
    district.name,
    {
      ...district,
      categories: district.categoryMeta,
      institutions: Object.fromEntries(
        Object.entries(district.institutions).map(([categoryId, items]) => [
          categoryId,
          items.map((name, index) => ({
            id: `${categoryId.toUpperCase()}${String(index + 1).padStart(3, '0')}`,
            name,
            total: `${(index + 1) * 150 + 100}`,
            applied: `${(index + 1) * 120 + 90}`,
            pct: `${Math.min(98, 68 + index * 2)}%`,
            approved: `${(index + 1) * 110 + 80}`,
            rejected: `${(index + 1) * 8 + 5}`,
            pending: `${(index + 1) * 6 + 4}`,
            disbursed: `₹${(index + 1) * 1.4}L`,
          }))
        ])
      ),
    }
  ])
);

export default function App() {
  // Navigation State
  // View 1: District Grid
  // View 2: District Category Overview
  // View 3: Institution Table
  // View 4: Institution Analytics
  const [currentView, setCurrentView] = useState(1);
  const [selectedDistrict, setSelectedDistrict] = useState('Bengaluru Urban');
  const [selectedCategoryId, setSelectedCategoryId] = useState('pu');
  const [selectedInstitutionId, setSelectedInstitutionId] = useState('PU12849');

  // Navigate helpers
  const handleSelectDistrict = (distName) => {
    if (portalData[distName]) {
      setSelectedDistrict(distName);
      setCurrentView(2);
    } else {
      alert(`Data for ${distName} is being synchronized from state servers.`);
    }
  };

  const handleSelectCategory = (catId) => {
    setSelectedCategoryId(catId);
    setCurrentView(3);
  };

  const handleSelectInstitution = (instId) => {
    setSelectedInstitutionId(instId);
    setCurrentView(4);
  };

  return (
    <div className="min-h-screen bg-[#f4f6fb] text-slate-800 flex flex-col font-sans">
      {/* GLOBAL NAVBAR */}
      <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => setCurrentView(1)}>
          <div className="p-2 bg-indigo-950 text-white rounded-lg">
            <Building2 className="w-5 h-5" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Karnataka Scholarship Portal
          </h1>
        </div>

        <div className="flex items-center gap-6 text-sm font-medium text-slate-600">
          <button 
            onClick={() => setCurrentView(1)}
            className={`hover:text-indigo-600 ${currentView === 1 ? 'text-indigo-600 font-semibold underline underline-offset-8 decoration-2' : ''}`}
          >
            District Dashboard
          </button>
          <button className="hover:text-indigo-600">Institution Map</button>
          <button className="hover:text-indigo-600">Scheme Performance</button>
          <div className="h-4 w-[1px] bg-slate-200" />
          <button className="relative p-1.5 rounded-full hover:bg-slate-100 text-slate-600">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
          </button>
          <div className="w-8 h-8 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-xs">
            AD
          </div>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <div className="flex flex-1">
        {/* SIDEBAR */}
        <aside className="w-64 bg-white border-r border-slate-200 p-4 flex flex-col justify-between shrink-0">
          <div>
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl mb-6 border border-slate-100">
              <div className="w-10 h-10 rounded-lg bg-indigo-900 text-white flex items-center justify-center font-bold text-sm">
                KA
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">Admin Panel</h2>
                <p className="text-xs text-slate-500">Education Dept. KA</p>
              </div>
            </div>

            <nav className="space-y-1">
              <button 
                onClick={() => setCurrentView(1)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition ${
                  currentView === 1 ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <LayoutDashboard className="w-4 h-4" />
                Dashboard
              </button>
              <button 
                onClick={() => setCurrentView(2)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition ${
                  currentView === 2 ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <BarChart3 className="w-4 h-4" />
                Analytics
              </button>
              <button 
                onClick={() => setCurrentView(3)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition ${
                  currentView === 3 ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <FileText className="w-4 h-4" />
                Reports
              </button>
              <button 
                onClick={() => setCurrentView(4)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition ${
                  currentView === 4 ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Lightbulb className="w-4 h-4" />
                AI Insights
              </button>
            </nav>
          </div>

          <div className="text-xs text-slate-400 px-3">
            System Version v2.4.0
          </div>
        </aside>

        {/* DYNAMIC VIEW ROUTER */}
        <main className="flex-1 p-8 overflow-y-auto">
          {currentView === 1 && (
            <View1DistrictGrid onSelectDistrict={handleSelectDistrict} />
          )}

          {currentView === 2 && (
            <View2Categories 
              districtName={selectedDistrict} 
              onSelectCategory={handleSelectCategory}
              onBack={() => setCurrentView(1)}
            />
          )}

          {currentView === 3 && (
            <View3CollegeList 
              districtName={selectedDistrict}
              categoryId={selectedCategoryId}
              onSelectCollege={handleSelectInstitution}
              onBack={() => setCurrentView(2)}
            />
          )}

          {currentView === 4 && (
            <View4Analytics 
              districtName={selectedDistrict}
              categoryId={selectedCategoryId}
              institutionId={selectedInstitutionId}
              onBack={() => setCurrentView(3)}
            />
          )}
        </main>
      </div>

      {/* FOOTER */}
      <footer className="bg-white border-t border-slate-200 px-8 py-4 flex items-center justify-between text-xs text-slate-500">
        <div>
          <span className="font-semibold text-slate-700">KA Scholarship Monitoring</span> © 2024 Government of Karnataka | Monitoring Division
        </div>
        <div className="flex gap-6">
          <a href="#" className="hover:underline">Privacy Policy</a>
          <a href="#" className="hover:underline">Support</a>
          <a href="#" className="hover:underline">Data Governance</a>
        </div>
      </footer>
    </div>
  );
}

// ==========================================
// VIEW 1: DISTRICT PERFORMANCE GRID
// ==========================================
function View1DistrictGrid({ onSelectDistrict }) {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="text-xs text-slate-500 font-medium">
        Dashboard &gt; <span className="text-slate-800">Karnataka District Analytics</span>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex gap-4">
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Academic Year</label>
              <select className="bg-slate-50 border border-slate-200 text-sm font-semibold rounded-lg px-3 py-1.5 focus:outline-none">
                <option>2023-2024</option>
                <option>2024-2025</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Scholarship Scheme</label>
              <select className="bg-slate-50 border border-slate-200 text-sm font-semibold rounded-lg px-3 py-1.5 focus:outline-none">
                <option>SSP Post-Matric</option>
                <option>SSP Pre-Matric</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button className="bg-indigo-900 hover:bg-indigo-950 text-white text-xs font-semibold px-4 py-2 rounded-lg flex items-center gap-2">
              <Download className="w-3.5 h-3.5" />
              Export State Report
            </button>
            <button className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600">
              <Filter className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2">
          <div className="p-4 bg-slate-50/50 border border-slate-200 rounded-xl relative">
            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded absolute top-3 right-3">+12% vs LY</span>
            <p className="text-xs font-semibold text-slate-500 mb-1">Total Applications</p>
            <p className="text-2xl font-black text-slate-900">2,482,901</p>
          </div>
          <div className="p-4 bg-slate-50/50 border border-slate-200 rounded-xl relative">
            <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded absolute top-3 right-3">84.2% Rate</span>
            <p className="text-xs font-semibold text-slate-500 mb-1">Approved Claims</p>
            <p className="text-2xl font-black text-slate-900">2,091,012</p>
          </div>
          <div className="p-4 bg-slate-50/50 border border-slate-200 rounded-xl relative">
            <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded absolute top-3 right-3">₹ 4.2k Cr</span>
            <p className="text-xs font-semibold text-slate-500 mb-1">Disbursed Amount</p>
            <p className="text-2xl font-black text-slate-900">₹ 3,842.50 Cr</p>
          </div>
          <div className="p-4 bg-slate-50/50 border border-slate-200 rounded-xl relative">
            <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded absolute top-3 right-3">Active Institutions</span>
            <p className="text-xs font-semibold text-slate-500 mb-1">Enrolled Entities</p>
            <p className="text-2xl font-black text-slate-900">18,294</p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between pt-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">District Performance Grid</h2>
          <p className="text-xs text-slate-500">Real-time scholarship monitoring across 31 administrative districts. Click any card to drill down.</p>
        </div>
        <div className="flex items-center gap-1 bg-white border border-slate-200 p-1 rounded-lg">
          <button className="p-1.5 bg-slate-100 rounded text-slate-700"><Grid className="w-4 h-4" /></button>
          <button className="p-1.5 text-slate-400 hover:text-slate-600"><List className="w-4 h-4" /></button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Object.entries(portalData).map(([distName, data]) => (
          <div 
            key={distName}
            onClick={() => onSelectDistrict(distName)}
            className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-500 transition cursor-pointer flex flex-col justify-between group"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-slate-100 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition rounded-xl">
                    <Building2 className="w-5 h-5 text-slate-700 group-hover:text-indigo-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 leading-tight group-hover:text-indigo-600 transition">{distName}</h3>
                    <p className="text-[11px] text-slate-400">District Code: {data.code}</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-600 transition" />
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                <div className="bg-slate-50 p-2 rounded-lg">
                  <span className="text-[10px] font-bold text-slate-400 block">INSTITUTIONS</span>
                  <span className="font-bold text-slate-800">{data.instCount}</span>
                </div>
                <div className="bg-slate-50 p-2 rounded-lg">
                  <span className="text-[10px] font-bold text-slate-400 block">REGISTERED</span>
                  <span className="font-bold text-slate-800">{data.regCount}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs mb-4">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 block">APPROVED</span>
                  <span className="font-bold text-indigo-600">{data.approvedCount}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 block">PENDING</span>
                  <span className="font-bold text-red-500">{data.pendingCount}</span>
                </div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-bold mb-1">
                <span className="text-slate-500">Scholarship Coverage</span>
                <span className="text-slate-800">{data.coverage}%</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div 
                  className={`h-full ${data.coverage > 80 ? 'bg-indigo-900' : 'bg-amber-500'}`} 
                  style={{ width: `${data.coverage}%` }} 
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ==========================================
// VIEW 2: INSTITUTION CATEGORIES VIEW
// ==========================================
function View2Categories({ districtName, onSelectCategory, onBack }) {
  const district = portalData[districtName];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
        <button onClick={onBack} className="hover:underline text-indigo-600">Dashboard</button>
        <span>&gt;</span>
        <span>Karnataka</span>
        <span>&gt;</span>
        <span className="text-slate-800 font-semibold">{districtName}</span>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-900">{districtName} Categories</h2>
          <p className="text-xs text-slate-500 mt-1">Select an institution category to inspect active scholarship performance metrics in {districtName}.</p>
        </div>
        <button onClick={onBack} className="text-xs font-bold text-slate-600 bg-white border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-50">
          ← Back to All Districts
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {district?.categories?.map((cat) => {
          const IconComponent = cat.icon || School;
          return (
            <div 
              key={cat.id}
              onClick={() => onSelectCategory(cat.id)}
              className="bg-white rounded-2xl p-6 border border-slate-200 hover:border-indigo-600 hover:shadow-lg transition cursor-pointer flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-start gap-3 mb-6">
                  <div className="p-3 bg-slate-100 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition rounded-xl">
                    <IconComponent className="w-6 h-6 text-slate-700 group-hover:text-indigo-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-base leading-snug group-hover:text-indigo-600">{cat.name}</h3>
                    <p className="text-[11px] text-slate-400">{cat.sub}</p>
                  </div>
                </div>

                <div className="space-y-4 text-xs mb-8">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block tracking-wider uppercase">Total Institutions</span>
                    <span className="text-2xl font-black text-slate-900">{cat.total}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block tracking-wider uppercase">Total Students</span>
                    <span className="text-2xl font-black text-slate-900">{cat.students}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block tracking-wider uppercase">Scholarships</span>
                    <span className="text-2xl font-black text-slate-900">{cat.approved}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block tracking-wider uppercase">Approval Rate</span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-2xl font-black text-slate-900">{cat.rate}</span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${cat.badgeColor}`}>
                        {cat.badge}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 text-indigo-600 font-bold text-xs flex items-center justify-between group-hover:translate-x-1 transition-transform">
                View All Institutions
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-white rounded-2xl p-6 border border-indigo-200 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-5">
          <div className="w-12 h-12 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
            <PieChart className="w-6 h-6" />
          </div>
          <div className="max-w-2xl">
            <h4 className="font-bold text-slate-900 text-sm mb-1">District Performance Summary</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              <span className="font-semibold text-slate-800">{districtName}</span> is currently operating with a scholarship coverage rate of <span className="font-bold text-indigo-700">{district.coverage}%</span> across {district.instCount} registered entities.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// VIEW 3: INSTITUTION LIST TABLE
// ==========================================
function View3CollegeList({ districtName, categoryId, onSelectCollege, onBack }) {
  const [searchTerm, setSearchTerm] = useState('');
  const district = portalData[districtName];
  const category = district?.categories?.find(c => c.id === categoryId);
  const collegeList = district?.institutions?.[categoryId] || [];

  const filteredColleges = useMemo(() => {
    return collegeList.filter(col => 
      col.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      col.id.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [collegeList, searchTerm]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
        <button onClick={() => onBack()} className="hover:underline text-indigo-600">{districtName}</button>
        <span>&gt;</span>
        <span className="text-slate-800 font-semibold">{category?.name || 'Institutions'}</span>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-900">{category?.name || 'Institutions'}</h2>
          <p className="text-xs text-slate-500 mt-1">Showing institutions in {districtName}. Click any row to open deep analytics.</p>
        </div>
        <button onClick={onBack} className="text-xs font-bold text-slate-600 bg-white border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-50">
          ← Back to Categories
        </button>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="relative flex-1 min-w-[280px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input 
            type="text" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by Institution name or code..." 
            className="w-full bg-slate-50 border border-slate-200 text-xs rounded-xl pl-9 pr-4 py-2 focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              <th className="p-4">Institution Details</th>
              <th className="p-4">Total</th>
              <th className="p-4">Applied</th>
              <th className="p-4">%</th>
              <th className="p-4">Approved</th>
              <th className="p-4">Rejected</th>
              <th className="p-4">Pending</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs">
            {filteredColleges.length > 0 ? (
              filteredColleges.map((col) => (
                <tr 
                  key={col.id} 
                  onClick={() => onSelectCollege(col.id)}
                  className="hover:bg-indigo-50/50 transition cursor-pointer group"
                >
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-indigo-50 text-indigo-700 rounded-lg group-hover:bg-indigo-600 group-hover:text-white transition">
                        <School className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="font-bold text-slate-900 block group-hover:text-indigo-600 transition">{col.name}</span>
                        <span className="text-[10px] text-slate-400">Code: {col.id}</span>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 font-semibold text-slate-700">{col.total}</td>
                  <td className="p-4 font-semibold text-slate-700">{col.applied}</td>
                  <td className="p-4 font-bold text-indigo-900">{col.pct}</td>
                  <td className="p-4 font-semibold text-slate-700">{col.approved}</td>
                  <td className="p-4 font-bold text-red-500">{col.rejected}</td>
                  <td className="p-4 font-bold text-amber-600">{col.pending}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="7" className="p-8 text-center text-slate-400 text-xs">
                  No institutions found matching "{searchTerm}"
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ==========================================
// VIEW 4: INSTITUTION ANALYTICS
// ==========================================
function View4Analytics({ districtName, categoryId, institutionId, onBack }) {
  const district = portalData[districtName];
  const list = district?.institutions?.[categoryId] || [];
  const inst = list.find(i => i.id === institutionId) || list[0] || { name: "Institution Analytics", total: "1,240", applied: "1,140", approved: "1,140", rejected: "40", pending: "60", disbursed: "₹12.4L" };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
        <span>Dashboard</span>
        <span>&gt;</span>
        <span>{districtName}</span>
        <span>&gt;</span>
        <span className="text-slate-800 font-semibold">{inst.name}</span>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-900">Institution Analytics</h2>
          <p className="text-xs text-slate-500 mt-1">Deep-dive scholarship performance metrics for {inst.name}.</p>
        </div>
        <button onClick={onBack} className="text-xs font-bold text-slate-600 bg-white border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-50">
          ← Back to Institution List
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 block uppercase">Students</span>
          <p className="text-xl font-black text-slate-900 mt-1">{inst.total}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 block uppercase">Applications</span>
          <p className="text-xl font-black text-slate-900 mt-1">{inst.applied}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 block uppercase">Approved</span>
          <p className="text-xl font-black text-emerald-600 mt-1">{inst.approved}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 block uppercase">Rejected</span>
          <p className="text-xl font-black text-red-500 mt-1">{inst.rejected}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 block uppercase">Pending</span>
          <p className="text-xl font-black text-amber-500 mt-1">{inst.pending}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 block uppercase">Disbursed</span>
          <p className="text-xl font-black text-slate-900 mt-1">{inst.disbursed}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="font-bold text-slate-900 text-base mb-1">Gap Analysis</h3>
          <p className="text-xs text-slate-400 mb-6">Tracking non-applicants at {inst.name}</p>

          <div className="space-y-4 text-xs">
            <div>
              <div className="flex justify-between font-semibold text-slate-700 mb-1">
                <span>Unaware of Schemes</span>
                <span>32%</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div className="bg-indigo-600 h-full" style={{ width: '32%' }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between font-semibold text-slate-700 mb-1">
                <span>Documentation Issues</span>
                <span>24%</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div className="bg-indigo-500 h-full" style={{ width: '24%' }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between font-semibold text-slate-700 mb-1">
                <span>Aadhaar-Phone Mismatch</span>
                <span>12%</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div className="bg-indigo-300 h-full" style={{ width: '12%' }} />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm text-center">
          <h3 className="font-bold text-slate-900 text-sm mb-4 text-left">Approval Status</h3>
          <div className="relative inline-flex items-center justify-center my-2">
            <div className="w-32 h-32 rounded-full border-8 border-emerald-500 border-t-red-500 flex items-center justify-center">
              <div className="text-center">
                <span className="text-2xl font-black text-slate-900 block leading-tight">{inst.pct}</span>
                <span className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase">SUCCESS</span>
              </div>
            </div>
          </div>

          <div className="flex justify-center gap-6 text-xs font-semibold mt-4">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span>Approved ({inst.approved})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
              <span>Rejected ({inst.rejected})</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}