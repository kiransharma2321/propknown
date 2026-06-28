import { NextRequest, NextResponse } from "next/server";

// ─── Types ───────────────────────────────────────────────────────────────────
type Risk  = "Low" | "Medium" | "High" | "Very High";
type Trend = "Strong Bull" | "Bull" | "Stable" | "Bear";

interface Loc {
  currency: string; symbol: string;
  psf:    [number, number];  // price per sqft [min, max] in local currency
  g:      number;            // annual growth %
  y:      [number, number];  // rental yield [min, max] %
  risk:   Risk;
  infra:  number;            // 0–100
  liv:    number;            // livability 0–100
  demand: number;            // demand score 0–100
  trend:  Trend;
}

// ─── 200+ Location Database ───────────────────────────────────────────────────
const LOCATIONS: Record<string, Loc> = {
  // ── India · Hyderabad ─────────────────────────────────────────────────────
  "Kokapet":               {currency:"INR",symbol:"₹",psf:[8000,12000], g:14,y:[3.0,4.5],risk:"Medium",infra:75, liv:72, demand:87,trend:"Strong Bull"},
  "Gachibowli":            {currency:"INR",symbol:"₹",psf:[7500,11000], g:12,y:[3.0,4.0],risk:"Low",   infra:82, liv:80, demand:85,trend:"Bull"},
  "Nanakramguda":          {currency:"INR",symbol:"₹",psf:[8000,12500], g:13,y:[3.0,4.5],risk:"Low",   infra:80, liv:78, demand:86,trend:"Bull"},
  "Financial District":    {currency:"INR",symbol:"₹",psf:[9000,14000], g:13,y:[3.5,5.0],risk:"Low",   infra:85, liv:80, demand:88,trend:"Strong Bull"},
  "Kondapur":              {currency:"INR",symbol:"₹",psf:[6500,9500],  g:11,y:[2.5,4.0],risk:"Low",   infra:80, liv:78, demand:82,trend:"Bull"},
  "Madhapur":              {currency:"INR",symbol:"₹",psf:[7000,10500], g:12,y:[3.0,4.0],risk:"Low",   infra:82, liv:80, demand:84,trend:"Bull"},
  "HITEC City":            {currency:"INR",symbol:"₹",psf:[8000,12000], g:12,y:[3.5,5.0],risk:"Low",   infra:85, liv:80, demand:86,trend:"Bull"},
  "Nallagandla":           {currency:"INR",symbol:"₹",psf:[6000,9000],  g:11,y:[2.5,3.5],risk:"Medium",infra:72, liv:70, demand:78,trend:"Bull"},
  "Tellapur":              {currency:"INR",symbol:"₹",psf:[5500,8000],  g:10,y:[2.0,3.5],risk:"Medium",infra:65, liv:65, demand:73,trend:"Bull"},
  "Mokila":                {currency:"INR",symbol:"₹",psf:[5000,7500],  g:10,y:[2.0,3.0],risk:"Medium",infra:60, liv:60, demand:70,trend:"Stable"},
  "Kollur":                {currency:"INR",symbol:"₹",psf:[4500,7000],  g:10,y:[2.0,3.0],risk:"Medium",infra:58, liv:58, demand:68,trend:"Stable"},
  "Narsingi":              {currency:"INR",symbol:"₹",psf:[6000,9000],  g:11,y:[2.5,3.5],risk:"Medium",infra:68, liv:70, demand:75,trend:"Bull"},
  "Manikonda":             {currency:"INR",symbol:"₹",psf:[5500,8000],  g:10,y:[2.5,3.5],risk:"Medium",infra:70, liv:70, demand:73,trend:"Bull"},
  "Puppalguda":            {currency:"INR",symbol:"₹",psf:[6000,9000],  g:11,y:[2.5,3.5],risk:"Medium",infra:68, liv:68, demand:74,trend:"Bull"},
  "Rajendra Nagar":        {currency:"INR",symbol:"₹",psf:[5000,7500],  g:9, y:[2.0,3.0],risk:"Medium",infra:65, liv:65, demand:68,trend:"Stable"},
  "Medchal":               {currency:"INR",symbol:"₹",psf:[4000,6500],  g:10,y:[2.0,3.0],risk:"Medium",infra:62, liv:60, demand:68,trend:"Bull"},
  "Shamshabad":            {currency:"INR",symbol:"₹",psf:[4500,7000],  g:10,y:[2.0,3.0],risk:"Medium",infra:65, liv:60, demand:70,trend:"Stable"},
  "Shadnagar":             {currency:"INR",symbol:"₹",psf:[3500,5500],  g:9, y:[1.5,2.5],risk:"High",  infra:55, liv:55, demand:60,trend:"Stable"},
  "Adibatla":              {currency:"INR",symbol:"₹",psf:[4000,6000],  g:10,y:[1.5,2.5],risk:"High",  infra:58, liv:55, demand:65,trend:"Bull"},
  "Uppal":                 {currency:"INR",symbol:"₹",psf:[5000,7500],  g:9, y:[2.0,3.0],risk:"Medium",infra:70, liv:68, demand:68,trend:"Stable"},
  "Kompally":              {currency:"INR",symbol:"₹",psf:[4500,7000],  g:9, y:[2.0,3.0],risk:"Medium",infra:65, liv:65, demand:65,trend:"Stable"},
  "Bachupally":            {currency:"INR",symbol:"₹",psf:[4500,7000],  g:9, y:[2.0,3.0],risk:"Medium",infra:65, liv:65, demand:65,trend:"Stable"},
  "Nizampet":              {currency:"INR",symbol:"₹",psf:[5000,7500],  g:10,y:[2.0,3.5],risk:"Medium",infra:68, liv:68, demand:70,trend:"Bull"},
  "Miyapur":               {currency:"INR",symbol:"₹",psf:[5000,7500],  g:9, y:[2.0,3.0],risk:"Medium",infra:68, liv:68, demand:68,trend:"Stable"},
  "Kukatpally":            {currency:"INR",symbol:"₹",psf:[5500,8000],  g:10,y:[2.5,3.5],risk:"Medium",infra:72, liv:72, demand:72,trend:"Bull"},
  "Banjara Hills":         {currency:"INR",symbol:"₹",psf:[10000,18000],g:10,y:[2.0,3.0],risk:"Low",   infra:90, liv:92, demand:82,trend:"Bull"},
  "Jubilee Hills":         {currency:"INR",symbol:"₹",psf:[11000,20000],g:10,y:[2.0,3.0],risk:"Low",   infra:92, liv:94, demand:83,trend:"Bull"},
  "Film Nagar":            {currency:"INR",symbol:"₹",psf:[9000,15000], g:10,y:[2.0,3.0],risk:"Low",   infra:88, liv:88, demand:80,trend:"Bull"},
  "Begumpet":              {currency:"INR",symbol:"₹",psf:[8000,12000], g:9, y:[2.5,3.5],risk:"Low",   infra:85, liv:85, demand:78,trend:"Stable"},

  // ── India · Bangalore ─────────────────────────────────────────────────────
  "Whitefield":            {currency:"INR",symbol:"₹",psf:[7000,11000], g:13,y:[3.0,4.5],risk:"Low",   infra:82, liv:78, demand:88,trend:"Strong Bull"},
  "Sarjapur Road":         {currency:"INR",symbol:"₹",psf:[7500,11500], g:13,y:[3.0,4.5],risk:"Low",   infra:80, liv:78, demand:88,trend:"Strong Bull"},
  "Electronic City":       {currency:"INR",symbol:"₹",psf:[5500,8500],  g:11,y:[2.5,4.0],risk:"Medium",infra:75, liv:72, demand:82,trend:"Bull"},
  "Marathahalli":          {currency:"INR",symbol:"₹",psf:[7000,10500], g:12,y:[3.0,4.0],risk:"Low",   infra:80, liv:78, demand:84,trend:"Bull"},
  "Bellandur":             {currency:"INR",symbol:"₹",psf:[7500,11000], g:12,y:[3.0,4.5],risk:"Low",   infra:80, liv:78, demand:85,trend:"Bull"},
  "HSR Layout":            {currency:"INR",symbol:"₹",psf:[8500,13000], g:12,y:[3.0,4.0],risk:"Low",   infra:85, liv:85, demand:86,trend:"Bull"},
  "Koramangala":           {currency:"INR",symbol:"₹",psf:[10000,16000],g:11,y:[3.0,4.0],risk:"Low",   infra:90, liv:90, demand:85,trend:"Bull"},
  "Indiranagar":           {currency:"INR",symbol:"₹",psf:[11000,18000],g:11,y:[3.0,4.0],risk:"Low",   infra:92, liv:92, demand:88,trend:"Bull"},
  "Hebbal":                {currency:"INR",symbol:"₹",psf:[7000,10500], g:12,y:[3.0,4.0],risk:"Low",   infra:80, liv:80, demand:84,trend:"Bull"},
  "Yelahanka":             {currency:"INR",symbol:"₹",psf:[5500,8500],  g:11,y:[2.5,3.5],risk:"Medium",infra:72, liv:72, demand:75,trend:"Bull"},
  "Devanahalli":           {currency:"INR",symbol:"₹",psf:[4500,7000],  g:13,y:[2.0,3.0],risk:"Medium",infra:70, liv:65, demand:78,trend:"Strong Bull"},
  "Bannerghatta Road":     {currency:"INR",symbol:"₹",psf:[6000,9000],  g:10,y:[2.5,3.5],risk:"Medium",infra:75, liv:75, demand:72,trend:"Stable"},
  "JP Nagar":              {currency:"INR",symbol:"₹",psf:[7500,11000], g:10,y:[2.5,3.5],risk:"Low",   infra:82, liv:82, demand:76,trend:"Stable"},
  "Jayanagar":             {currency:"INR",symbol:"₹",psf:[9000,14000], g:9, y:[2.0,3.0],risk:"Low",   infra:88, liv:90, demand:76,trend:"Stable"},
  "Banashankari":          {currency:"INR",symbol:"₹",psf:[8000,12000], g:10,y:[2.5,3.5],risk:"Low",   infra:85, liv:85, demand:76,trend:"Stable"},

  // ── India · Mumbai ────────────────────────────────────────────────────────
  "Bandra":                {currency:"INR",symbol:"₹",psf:[35000,60000],g:8, y:[2.0,3.0],risk:"Low",   infra:92, liv:95, demand:80,trend:"Stable"},
  "Powai":                 {currency:"INR",symbol:"₹",psf:[18000,28000],g:9, y:[3.0,4.0],risk:"Low",   infra:85, liv:85, demand:82,trend:"Bull"},
  "Andheri":               {currency:"INR",symbol:"₹",psf:[20000,32000],g:8, y:[3.0,4.0],risk:"Low",   infra:85, liv:85, demand:78,trend:"Stable"},
  "Thane":                 {currency:"INR",symbol:"₹",psf:[12000,18000],g:9, y:[3.0,4.5],risk:"Low",   infra:80, liv:80, demand:78,trend:"Bull"},
  "Navi Mumbai":           {currency:"INR",symbol:"₹",psf:[10000,16000],g:10,y:[3.0,5.0],risk:"Medium",infra:78, liv:75, demand:80,trend:"Bull"},
  "Worli":                 {currency:"INR",symbol:"₹",psf:[45000,80000],g:7, y:[2.0,3.0],risk:"Low",   infra:95, liv:96, demand:78,trend:"Stable"},
  "Lower Parel":           {currency:"INR",symbol:"₹",psf:[35000,55000],g:7, y:[3.0,4.0],risk:"Low",   infra:90, liv:90, demand:78,trend:"Stable"},
  "Goregaon":              {currency:"INR",symbol:"₹",psf:[18000,28000],g:8, y:[3.0,4.0],risk:"Low",   infra:82, liv:80, demand:76,trend:"Stable"},
  "Malad":                 {currency:"INR",symbol:"₹",psf:[16000,25000],g:8, y:[3.0,4.0],risk:"Low",   infra:80, liv:78, demand:75,trend:"Stable"},
  "Borivali":              {currency:"INR",symbol:"₹",psf:[14000,22000],g:8, y:[3.0,4.0],risk:"Low",   infra:78, liv:78, demand:75,trend:"Stable"},
  "Panvel":                {currency:"INR",symbol:"₹",psf:[8000,13000], g:10,y:[3.0,5.0],risk:"Medium",infra:72, liv:68, demand:76,trend:"Bull"},
  "Kharghar":              {currency:"INR",symbol:"₹",psf:[9000,14000], g:10,y:[3.5,5.0],risk:"Medium",infra:75, liv:72, demand:76,trend:"Bull"},
  "Ulwe":                  {currency:"INR",symbol:"₹",psf:[7500,12000], g:11,y:[3.0,5.0],risk:"Medium",infra:70, liv:65, demand:73,trend:"Strong Bull"},

  // ── India · Delhi NCR ─────────────────────────────────────────────────────
  "Gurgaon":               {currency:"INR",symbol:"₹",psf:[12000,20000],g:11,y:[3.0,4.0],risk:"Low",   infra:88, liv:82, demand:85,trend:"Bull"},
  "Noida":                 {currency:"INR",symbol:"₹",psf:[8000,13000], g:10,y:[3.0,4.0],risk:"Low",   infra:82, liv:78, demand:80,trend:"Bull"},
  "Dwarka Expressway":     {currency:"INR",symbol:"₹",psf:[9000,14000], g:12,y:[3.0,4.5],risk:"Medium",infra:80, liv:75, demand:82,trend:"Strong Bull"},
  "Sohna Road":            {currency:"INR",symbol:"₹",psf:[7000,11000], g:11,y:[2.5,4.0],risk:"Medium",infra:75, liv:72, demand:78,trend:"Bull"},
  "Greater Noida":         {currency:"INR",symbol:"₹",psf:[6000,9500],  g:10,y:[2.5,4.0],risk:"Medium",infra:72, liv:68, demand:73,trend:"Bull"},
  "Faridabad":             {currency:"INR",symbol:"₹",psf:[5500,8500],  g:9, y:[2.0,3.5],risk:"Medium",infra:68, liv:65, demand:68,trend:"Stable"},
  "Indirapuram":           {currency:"INR",symbol:"₹",psf:[7000,10500], g:9, y:[2.5,3.5],risk:"Medium",infra:72, liv:70, demand:68,trend:"Stable"},
  "Sector 150 Noida":      {currency:"INR",symbol:"₹",psf:[7500,11500], g:11,y:[3.0,4.5],risk:"Medium",infra:78, liv:75, demand:80,trend:"Bull"},

  // ── India · Pune ──────────────────────────────────────────────────────────
  "Hinjewadi":             {currency:"INR",symbol:"₹",psf:[7000,11000], g:13,y:[3.0,4.5],risk:"Low",   infra:80, liv:75, demand:85,trend:"Strong Bull"},
  "Wakad":                 {currency:"INR",symbol:"₹",psf:[7500,11500], g:12,y:[3.0,4.5],risk:"Low",   infra:80, liv:78, demand:84,trend:"Bull"},
  "Baner":                 {currency:"INR",symbol:"₹",psf:[8500,13000], g:12,y:[3.0,4.0],risk:"Low",   infra:82, liv:82, demand:84,trend:"Bull"},
  "Kharadi":               {currency:"INR",symbol:"₹",psf:[7500,11000], g:12,y:[3.0,4.0],risk:"Low",   infra:80, liv:78, demand:83,trend:"Bull"},
  "Wagholi":               {currency:"INR",symbol:"₹",psf:[5500,8500],  g:11,y:[2.5,4.0],risk:"Medium",infra:70, liv:68, demand:78,trend:"Bull"},
  "Viman Nagar":           {currency:"INR",symbol:"₹",psf:[9000,14000], g:11,y:[3.0,4.0],risk:"Low",   infra:85, liv:85, demand:82,trend:"Bull"},
  "Hadapsar":              {currency:"INR",symbol:"₹",psf:[7000,10500], g:11,y:[3.0,4.0],risk:"Low",   infra:78, liv:78, demand:79,trend:"Bull"},
  "Magarpatta":            {currency:"INR",symbol:"₹",psf:[8000,12000], g:10,y:[3.0,4.0],risk:"Low",   infra:85, liv:85, demand:80,trend:"Stable"},

  // ── India · Chennai ───────────────────────────────────────────────────────
  "OMR":                   {currency:"INR",symbol:"₹",psf:[6000,9500],  g:11,y:[3.0,4.0],risk:"Low",   infra:78, liv:72, demand:80,trend:"Bull"},
  "ECR":                   {currency:"INR",symbol:"₹",psf:[5500,8500],  g:9, y:[2.0,3.0],risk:"Medium",infra:72, liv:70, demand:72,trend:"Stable"},
  "Porur":                 {currency:"INR",symbol:"₹",psf:[5500,8500],  g:10,y:[2.5,3.5],risk:"Medium",infra:72, liv:72, demand:72,trend:"Stable"},
  "Perambur":              {currency:"INR",symbol:"₹",psf:[5000,7500],  g:9, y:[2.0,3.0],risk:"Medium",infra:68, liv:68, demand:65,trend:"Stable"},
  "Anna Nagar":            {currency:"INR",symbol:"₹",psf:[9000,14000], g:9, y:[2.5,3.5],risk:"Low",   infra:85, liv:88, demand:75,trend:"Stable"},
  "Velachery":             {currency:"INR",symbol:"₹",psf:[7000,10500], g:10,y:[3.0,4.0],risk:"Low",   infra:78, liv:78, demand:76,trend:"Bull"},
  "Tambaram":              {currency:"INR",symbol:"₹",psf:[5000,7500],  g:9, y:[2.0,3.0],risk:"Medium",infra:68, liv:65, demand:65,trend:"Stable"},
  "Sholinganallur":        {currency:"INR",symbol:"₹",psf:[6500,10000], g:11,y:[3.0,4.0],risk:"Low",   infra:78, liv:75, demand:78,trend:"Bull"},

  // ── India · Kochi ─────────────────────────────────────────────────────────
  "Marine Drive Kochi":    {currency:"INR",symbol:"₹",psf:[8000,12000], g:10,y:[2.5,3.5],risk:"Low",   infra:80, liv:82, demand:72,trend:"Bull"},
  "Kakkanad":              {currency:"INR",symbol:"₹",psf:[5000,8000],  g:11,y:[2.5,3.5],risk:"Medium",infra:72, liv:70, demand:75,trend:"Bull"},
  "Edapally":              {currency:"INR",symbol:"₹",psf:[6000,9500],  g:10,y:[2.5,3.5],risk:"Medium",infra:75, liv:75, demand:73,trend:"Bull"},
  "Thrikkakara":           {currency:"INR",symbol:"₹",psf:[5500,8500],  g:10,y:[2.0,3.0],risk:"Medium",infra:70, liv:72, demand:70,trend:"Stable"},
  "Aluva":                 {currency:"INR",symbol:"₹",psf:[4500,7000],  g:9, y:[2.0,3.0],risk:"Medium",infra:65, liv:65, demand:65,trend:"Stable"},

  // ── India · Jaipur ────────────────────────────────────────────────────────
  "Vaishali Nagar":        {currency:"INR",symbol:"₹",psf:[5000,8000],  g:10,y:[2.0,3.0],risk:"Medium",infra:70, liv:72, demand:68,trend:"Stable"},
  "Malviya Nagar Jaipur":  {currency:"INR",symbol:"₹",psf:[5500,8500],  g:10,y:[2.0,3.0],risk:"Medium",infra:72, liv:72, demand:68,trend:"Stable"},
  "Mansarovar":            {currency:"INR",symbol:"₹",psf:[5000,8000],  g:9, y:[2.0,3.0],risk:"Medium",infra:68, liv:70, demand:65,trend:"Stable"},
  "C Scheme Jaipur":       {currency:"INR",symbol:"₹",psf:[8000,13000], g:9, y:[2.0,3.0],risk:"Low",   infra:80, liv:82, demand:70,trend:"Stable"},
  "Jagatpura":             {currency:"INR",symbol:"₹",psf:[4000,6500],  g:10,y:[1.5,2.5],risk:"High",  infra:60, liv:60, demand:60,trend:"Stable"},

  // ── India · Ahmedabad ─────────────────────────────────────────────────────
  "SG Highway":            {currency:"INR",symbol:"₹",psf:[5500,9000],  g:11,y:[2.5,3.5],risk:"Low",   infra:78, liv:75, demand:78,trend:"Bull"},
  "Prahlad Nagar":         {currency:"INR",symbol:"₹",psf:[6000,9500],  g:10,y:[2.5,3.5],risk:"Low",   infra:78, liv:78, demand:76,trend:"Stable"},
  "Bodakdev":              {currency:"INR",symbol:"₹",psf:[7000,11000], g:10,y:[2.0,3.0],risk:"Low",   infra:80, liv:80, demand:75,trend:"Stable"},
  "Satellite Ahmedabad":   {currency:"INR",symbol:"₹",psf:[6000,9500],  g:10,y:[2.5,3.0],risk:"Low",   infra:78, liv:78, demand:74,trend:"Stable"},
  "Thaltej":               {currency:"INR",symbol:"₹",psf:[6500,10000], g:11,y:[2.5,3.5],risk:"Low",   infra:78, liv:76, demand:76,trend:"Bull"},

  // ── India · Kolkata ───────────────────────────────────────────────────────
  "Salt Lake City":        {currency:"INR",symbol:"₹",psf:[6000,9500],  g:9, y:[2.0,3.0],risk:"Low",   infra:78, liv:80, demand:68,trend:"Stable"},
  "New Town Kolkata":      {currency:"INR",symbol:"₹",psf:[5500,9000],  g:10,y:[2.0,3.0],risk:"Low",   infra:76, liv:75, demand:72,trend:"Bull"},
  "Rajarhat":              {currency:"INR",symbol:"₹",psf:[4500,7500],  g:10,y:[2.0,3.0],risk:"Medium",infra:70, liv:68, demand:68,trend:"Bull"},
  "Alipore":               {currency:"INR",symbol:"₹",psf:[12000,18000],g:8, y:[1.5,2.5],risk:"Low",   infra:88, liv:90, demand:72,trend:"Stable"},
  "Behala":                {currency:"INR",symbol:"₹",psf:[4000,6500],  g:8, y:[2.0,3.0],risk:"Medium",infra:65, liv:65, demand:60,trend:"Stable"},

  // ── India · Nagpur ────────────────────────────────────────────────────────
  "Wardha Road":           {currency:"INR",symbol:"₹",psf:[4000,6500],  g:9, y:[2.0,3.0],risk:"Medium",infra:65, liv:62, demand:62,trend:"Stable"},
  "Dharampeth":            {currency:"INR",symbol:"₹",psf:[5500,8500],  g:8, y:[2.0,3.0],risk:"Low",   infra:70, liv:72, demand:62,trend:"Stable"},
  "Manish Nagar":          {currency:"INR",symbol:"₹",psf:[4500,7000],  g:8, y:[2.0,3.0],risk:"Medium",infra:62, liv:62, demand:58,trend:"Stable"},
  "Hingna":                {currency:"INR",symbol:"₹",psf:[3500,5500],  g:9, y:[1.5,2.5],risk:"High",  infra:58, liv:55, demand:58,trend:"Stable"},

  // ── India · Coimbatore ────────────────────────────────────────────────────
  "RS Puram":              {currency:"INR",symbol:"₹",psf:[5500,8500],  g:9, y:[2.0,3.0],risk:"Low",   infra:72, liv:75, demand:65,trend:"Stable"},
  "Peelamedu":             {currency:"INR",symbol:"₹",psf:[5000,8000],  g:10,y:[2.0,3.0],risk:"Low",   infra:70, liv:70, demand:68,trend:"Stable"},
  "Saibaba Colony":        {currency:"INR",symbol:"₹",psf:[5500,8000],  g:9, y:[2.0,3.0],risk:"Low",   infra:72, liv:72, demand:64,trend:"Stable"},
  "Avinashi Road":         {currency:"INR",symbol:"₹",psf:[5000,8000],  g:10,y:[2.0,3.0],risk:"Medium",infra:70, liv:68, demand:68,trend:"Stable"},

  // ── India · Visakhapatnam ─────────────────────────────────────────────────
  "Madhurawada":           {currency:"INR",symbol:"₹",psf:[5000,8000],  g:10,y:[2.0,3.0],risk:"Medium",infra:70, liv:70, demand:68,trend:"Bull"},
  "Rushikonda":            {currency:"INR",symbol:"₹",psf:[6000,9500],  g:9, y:[2.0,3.0],risk:"Low",   infra:72, liv:75, demand:68,trend:"Stable"},
  "MVP Colony":            {currency:"INR",symbol:"₹",psf:[6500,10000], g:9, y:[2.0,3.0],risk:"Low",   infra:75, liv:75, demand:68,trend:"Stable"},
  "Seethammadhara":        {currency:"INR",symbol:"₹",psf:[7000,11000], g:9, y:[2.0,3.0],risk:"Low",   infra:78, liv:78, demand:68,trend:"Stable"},

  // ── India · Surat ─────────────────────────────────────────────────────────
  "Vesu":                  {currency:"INR",symbol:"₹",psf:[5500,8500],  g:10,y:[2.0,3.0],risk:"Low",   infra:72, liv:72, demand:70,trend:"Bull"},
  "Adajan":                {currency:"INR",symbol:"₹",psf:[5000,8000],  g:10,y:[2.0,3.0],risk:"Low",   infra:70, liv:72, demand:68,trend:"Bull"},
  "Pal Surat":             {currency:"INR",symbol:"₹",psf:[4500,7000],  g:9, y:[2.0,3.0],risk:"Medium",infra:65, liv:65, demand:65,trend:"Stable"},
  "Citylight Surat":       {currency:"INR",symbol:"₹",psf:[5500,9000],  g:9, y:[2.0,3.0],risk:"Low",   infra:70, liv:72, demand:68,trend:"Stable"},

  // ── India · Indore ────────────────────────────────────────────────────────
  "Vijay Nagar Indore":    {currency:"INR",symbol:"₹",psf:[4500,7000],  g:11,y:[2.0,3.0],risk:"Medium",infra:68, liv:68, demand:68,trend:"Bull"},
  "AB Road Indore":        {currency:"INR",symbol:"₹",psf:[5000,8000],  g:10,y:[2.0,3.0],risk:"Medium",infra:70, liv:70, demand:68,trend:"Bull"},

  // ── UAE · Dubai ───────────────────────────────────────────────────────────
  "Downtown Dubai":        {currency:"AED",symbol:"AED ",psf:[2500,4500],g:12,y:[5.0,7.0],risk:"Low",   infra:95,liv:95, demand:88,trend:"Strong Bull"},
  "Dubai Marina":          {currency:"AED",symbol:"AED ",psf:[1800,3200],g:11,y:[5.0,7.0],risk:"Low",   infra:92,liv:92, demand:88,trend:"Bull"},
  "Palm Jumeirah":         {currency:"AED",symbol:"AED ",psf:[3000,6000],g:10,y:[4.0,6.0],risk:"Low",   infra:95,liv:98, demand:88,trend:"Bull"},
  "Business Bay":          {currency:"AED",symbol:"AED ",psf:[2000,3500],g:12,y:[5.5,7.5],risk:"Low",   infra:92,liv:88, demand:90,trend:"Strong Bull"},
  "JVC":                   {currency:"AED",symbol:"AED ",psf:[800,1400],  g:13,y:[6.0,8.0],risk:"Medium",infra:78,liv:75, demand:85,trend:"Strong Bull"},
  "Dubai Hills":           {currency:"AED",symbol:"AED ",psf:[1400,2200],g:13,y:[4.5,6.0],risk:"Low",   infra:88,liv:88, demand:88,trend:"Strong Bull"},
  "Arabian Ranches":       {currency:"AED",symbol:"AED ",psf:[1200,2000],g:10,y:[4.0,5.5],risk:"Low",   infra:85,liv:90, demand:82,trend:"Bull"},
  "Jumeirah":              {currency:"AED",symbol:"AED ",psf:[2200,4000],g:9, y:[4.0,5.5],risk:"Low",   infra:90,liv:95, demand:82,trend:"Stable"},
  "DIFC":                  {currency:"AED",symbol:"AED ",psf:[2800,5000],g:10,y:[5.0,7.0],risk:"Low",   infra:95,liv:90, demand:85,trend:"Bull"},
  "Dubai Creek Harbour":   {currency:"AED",symbol:"AED ",psf:[1600,2800],g:14,y:[5.0,7.0],risk:"Medium",infra:82,liv:80, demand:88,trend:"Strong Bull"},
  "Emaar Beachfront":      {currency:"AED",symbol:"AED ",psf:[2500,4500],g:12,y:[5.0,7.0],risk:"Low",   infra:90,liv:92, demand:88,trend:"Strong Bull"},
  "Al Barsha":             {currency:"AED",symbol:"AED ",psf:[1000,1700],g:9, y:[5.0,7.0],risk:"Medium",infra:80,liv:80, demand:78,trend:"Stable"},
  "Meydan":                {currency:"AED",symbol:"AED ",psf:[1200,2000],g:11,y:[4.5,6.0],risk:"Medium",infra:82,liv:82, demand:82,trend:"Bull"},
  "Damac Hills":           {currency:"AED",symbol:"AED ",psf:[900,1500],  g:10,y:[4.0,6.0],risk:"Medium",infra:78,liv:78, demand:78,trend:"Bull"},
  "Sports City Dubai":     {currency:"AED",symbol:"AED ",psf:[750,1200],  g:10,y:[5.0,7.0],risk:"Medium",infra:78,liv:75, demand:78,trend:"Bull"},
  "Dubai Silicon Oasis":   {currency:"AED",symbol:"AED ",psf:[800,1300],  g:10,y:[5.0,7.0],risk:"Medium",infra:78,liv:72, demand:78,trend:"Bull"},
  "International City Dubai":{currency:"AED",symbol:"AED ",psf:[400,700],g:9, y:[7.0,9.0],risk:"Medium",infra:65,liv:62, demand:72,trend:"Stable"},

  // ── UAE · Abu Dhabi ───────────────────────────────────────────────────────
  "Al Reem Island":        {currency:"AED",symbol:"AED ",psf:[1200,2000],g:10,y:[5.0,7.0],risk:"Low",   infra:88,liv:85, demand:82,trend:"Bull"},
  "Saadiyat Island":       {currency:"AED",symbol:"AED ",psf:[2000,3500],g:10,y:[4.0,5.5],risk:"Low",   infra:92,liv:95, demand:85,trend:"Bull"},
  "Yas Island":            {currency:"AED",symbol:"AED ",psf:[1400,2200],g:11,y:[5.0,7.0],risk:"Low",   infra:88,liv:90, demand:85,trend:"Bull"},
  "Al Raha Beach":         {currency:"AED",symbol:"AED ",psf:[1600,2600],g:10,y:[5.0,7.0],risk:"Low",   infra:88,liv:88, demand:83,trend:"Bull"},
  "Khalifa City":          {currency:"AED",symbol:"AED ",psf:[900,1500],  g:9, y:[4.5,6.0],risk:"Medium",infra:78,liv:78, demand:75,trend:"Stable"},
  "Mohammed Bin Zayed City":{currency:"AED",symbol:"AED ",psf:[800,1300], g:9, y:[4.0,6.0],risk:"Medium",infra:75,liv:72, demand:72,trend:"Stable"},

  // ── UAE · Sharjah ─────────────────────────────────────────────────────────
  "Al Majaz":              {currency:"AED",symbol:"AED ",psf:[600,1000],  g:9, y:[5.0,7.0],risk:"Medium",infra:72,liv:75, demand:70,trend:"Stable"},
  "Muwaileh":              {currency:"AED",symbol:"AED ",psf:[700,1100],  g:10,y:[5.0,7.0],risk:"Medium",infra:72,liv:70, demand:72,trend:"Bull"},
  "Al Nahda Sharjah":      {currency:"AED",symbol:"AED ",psf:[600,950],   g:8, y:[5.0,7.0],risk:"Medium",infra:70,liv:72, demand:68,trend:"Stable"},
  "Al Qasimia":            {currency:"AED",symbol:"AED ",psf:[500,800],   g:8, y:[5.0,7.0],risk:"Medium",infra:65,liv:65, demand:65,trend:"Stable"},

  // ── UK · London ───────────────────────────────────────────────────────────
  "Canary Wharf":          {currency:"GBP",symbol:"£",psf:[700,1200],    g:5, y:[3.0,4.5],risk:"Low",   infra:92,liv:88, demand:80,trend:"Stable"},
  "Chelsea":               {currency:"GBP",symbol:"£",psf:[1500,2800],   g:4, y:[2.5,3.5],risk:"Low",   infra:95,liv:98, demand:78,trend:"Stable"},
  "Kensington":            {currency:"GBP",symbol:"£",psf:[1800,3200],   g:4, y:[2.0,3.0],risk:"Low",   infra:96,liv:98, demand:78,trend:"Stable"},
  "Mayfair":               {currency:"GBP",symbol:"£",psf:[2500,5000],   g:4, y:[2.0,3.0],risk:"Low",   infra:98,liv:98, demand:75,trend:"Stable"},
  "Shoreditch":            {currency:"GBP",symbol:"£",psf:[800,1400],    g:6, y:[3.0,5.0],risk:"Low",   infra:88,liv:85, demand:82,trend:"Bull"},
  "East London":           {currency:"GBP",symbol:"£",psf:[600,1000],    g:7, y:[3.5,5.0],risk:"Medium",infra:80,liv:80, demand:78,trend:"Bull"},
  "Nine Elms":             {currency:"GBP",symbol:"£",psf:[750,1300],    g:6, y:[3.0,4.5],risk:"Medium",infra:82,liv:80, demand:78,trend:"Bull"},
  "Battersea":             {currency:"GBP",symbol:"£",psf:[800,1400],    g:6, y:[3.0,4.5],risk:"Low",   infra:85,liv:85, demand:80,trend:"Bull"},
  "Westminster":           {currency:"GBP",symbol:"£",psf:[1500,2600],   g:4, y:[2.5,3.5],risk:"Low",   infra:96,liv:96, demand:78,trend:"Stable"},
  "Hammersmith":           {currency:"GBP",symbol:"£",psf:[700,1200],    g:5, y:[3.0,4.5],risk:"Low",   infra:88,liv:88, demand:78,trend:"Stable"},
  "Greenwich":             {currency:"GBP",symbol:"£",psf:[700,1200],    g:6, y:[3.0,4.5],risk:"Low",   infra:85,liv:85, demand:78,trend:"Bull"},
  "Brixton":               {currency:"GBP",symbol:"£",psf:[600,1000],    g:7, y:[3.5,5.0],risk:"Medium",infra:82,liv:82, demand:78,trend:"Bull"},
  "Hackney":               {currency:"GBP",symbol:"£",psf:[650,1100],    g:7, y:[3.5,5.0],risk:"Low",   infra:82,liv:82, demand:80,trend:"Bull"},

  // ── USA · New York ────────────────────────────────────────────────────────
  "Manhattan":             {currency:"USD",symbol:"$",psf:[1500,3500],   g:5, y:[2.0,3.5],risk:"Low",   infra:97,liv:96, demand:82,trend:"Stable"},
  "Brooklyn":              {currency:"USD",symbol:"$",psf:[800,1500],    g:7, y:[3.0,4.5],risk:"Low",   infra:90,liv:90, demand:84,trend:"Bull"},
  "Queens":                {currency:"USD",symbol:"$",psf:[600,1100],    g:7, y:[3.5,5.0],risk:"Medium",infra:85,liv:85, demand:80,trend:"Bull"},
  "Bronx":                 {currency:"USD",symbol:"$",psf:[400,700],     g:8, y:[4.0,6.0],risk:"Medium",infra:75,liv:75, demand:72,trend:"Bull"},
  "Hoboken NJ":            {currency:"USD",symbol:"$",psf:[700,1200],    g:6, y:[3.0,4.5],risk:"Low",   infra:88,liv:88, demand:82,trend:"Bull"},
  "Jersey City":           {currency:"USD",symbol:"$",psf:[650,1100],    g:7, y:[3.5,5.0],risk:"Low",   infra:85,liv:85, demand:80,trend:"Bull"},
  "Long Island City":      {currency:"USD",symbol:"$",psf:[900,1500],    g:6, y:[3.0,4.5],risk:"Low",   infra:88,liv:85, demand:80,trend:"Bull"},
  "Astoria":               {currency:"USD",symbol:"$",psf:[700,1200],    g:6, y:[3.0,4.5],risk:"Low",   infra:85,liv:85, demand:80,trend:"Bull"},

  // ── USA · Other ───────────────────────────────────────────────────────────
  "Beverly Hills LA":      {currency:"USD",symbol:"$",psf:[1200,2500],   g:5, y:[2.0,3.0],risk:"Low",   infra:94,liv:96, demand:78,trend:"Stable"},
  "Santa Monica LA":       {currency:"USD",symbol:"$",psf:[1000,2000],   g:5, y:[2.5,3.5],risk:"Low",   infra:92,liv:92, demand:80,trend:"Stable"},
  "Miami Beach":           {currency:"USD",symbol:"$",psf:[900,1800],    g:8, y:[3.0,5.0],risk:"Low",   infra:90,liv:92, demand:84,trend:"Bull"},
  "Brickell Miami":        {currency:"USD",symbol:"$",psf:[800,1500],    g:9, y:[4.0,6.0],risk:"Low",   infra:88,liv:88, demand:84,trend:"Bull"},
  "Downtown Austin":       {currency:"USD",symbol:"$",psf:[700,1300],    g:10,y:[3.5,5.0],risk:"Low",   infra:85,liv:82, demand:86,trend:"Strong Bull"},
  "Houston Heights":       {currency:"USD",symbol:"$",psf:[400,700],     g:7, y:[3.0,4.5],risk:"Medium",infra:78,liv:78, demand:76,trend:"Bull"},
  "Chicago Loop":          {currency:"USD",symbol:"$",psf:[500,900],     g:5, y:[4.0,5.5],risk:"Medium",infra:85,liv:82, demand:72,trend:"Stable"},
  "Seattle Bellevue":      {currency:"USD",symbol:"$",psf:[700,1300],    g:7, y:[3.0,4.5],risk:"Low",   infra:88,liv:88, demand:84,trend:"Bull"},
  "SoMa SF":               {currency:"USD",symbol:"$",psf:[900,1600],    g:5, y:[3.0,4.0],risk:"Low",   infra:88,liv:85, demand:78,trend:"Stable"},
  "Mission District SF":   {currency:"USD",symbol:"$",psf:[800,1400],    g:5, y:[3.0,4.5],risk:"Low",   infra:85,liv:85, demand:78,trend:"Stable"},
  "Pacific Heights SF":    {currency:"USD",symbol:"$",psf:[1400,2500],   g:4, y:[2.0,3.0],risk:"Low",   infra:92,liv:95, demand:75,trend:"Stable"},
  "Noe Valley SF":         {currency:"USD",symbol:"$",psf:[1100,2000],   g:5, y:[2.5,3.5],risk:"Low",   infra:88,liv:90, demand:75,trend:"Stable"},
  "South Beach SF":        {currency:"USD",symbol:"$",psf:[900,1600],    g:5, y:[3.0,4.0],risk:"Low",   infra:88,liv:85, demand:78,trend:"Stable"},

  // ── Singapore ─────────────────────────────────────────────────────────────
  "Orchard Road":          {currency:"SGD",symbol:"S$",psf:[2500,4500],  g:5, y:[2.5,3.5],risk:"Low",   infra:97,liv:98, demand:82,trend:"Stable"},
  "Marina Bay":            {currency:"SGD",symbol:"S$",psf:[3000,5500],  g:5, y:[2.5,3.5],risk:"Low",   infra:99,liv:99, demand:82,trend:"Stable"},
  "Sentosa Cove":          {currency:"SGD",symbol:"S$",psf:[2000,3500],  g:5, y:[3.0,4.0],risk:"Low",   infra:95,liv:97, demand:80,trend:"Stable"},
  "Jurong East":           {currency:"SGD",symbol:"S$",psf:[1000,1800],  g:6, y:[3.0,4.5],risk:"Low",   infra:88,liv:88, demand:80,trend:"Bull"},
  "Woodlands":             {currency:"SGD",symbol:"S$",psf:[800,1400],   g:5, y:[3.0,4.5],risk:"Low",   infra:85,liv:82, demand:76,trend:"Stable"},
  "Tampines":              {currency:"SGD",symbol:"S$",psf:[900,1500],   g:5, y:[3.0,4.5],risk:"Low",   infra:86,liv:86, demand:78,trend:"Stable"},
  "Buona Vista":           {currency:"SGD",symbol:"S$",psf:[1500,2500],  g:6, y:[3.0,4.0],risk:"Low",   infra:90,liv:90, demand:82,trend:"Bull"},
  "One North":             {currency:"SGD",symbol:"S$",psf:[1800,3000],  g:6, y:[3.0,4.0],risk:"Low",   infra:92,liv:90, demand:84,trend:"Bull"},

  // ── Canada · Toronto ──────────────────────────────────────────────────────
  "Downtown Toronto":      {currency:"CAD",symbol:"C$",psf:[900,1600],   g:6, y:[3.0,4.5],risk:"Low",   infra:90,liv:88, demand:82,trend:"Bull"},
  "Mississauga":           {currency:"CAD",symbol:"C$",psf:[600,1000],   g:7, y:[3.0,5.0],risk:"Low",   infra:85,liv:85, demand:80,trend:"Bull"},
  "Brampton":              {currency:"CAD",symbol:"C$",psf:[500,850],    g:7, y:[3.0,5.0],risk:"Medium",infra:80,liv:78, demand:76,trend:"Bull"},
  "North York":            {currency:"CAD",symbol:"C$",psf:[700,1200],   g:6, y:[3.0,4.5],risk:"Low",   infra:85,liv:85, demand:80,trend:"Bull"},
  "Scarborough":           {currency:"CAD",symbol:"C$",psf:[550,900],    g:6, y:[3.5,5.0],risk:"Low",   infra:78,liv:78, demand:76,trend:"Bull"},
  "Vaughan":               {currency:"CAD",symbol:"C$",psf:[600,1000],   g:7, y:[3.0,4.5],risk:"Low",   infra:82,liv:82, demand:78,trend:"Bull"},
  "Markham":               {currency:"CAD",symbol:"C$",psf:[650,1100],   g:7, y:[3.0,4.5],risk:"Low",   infra:83,liv:83, demand:80,trend:"Bull"},

  // ── Australia ─────────────────────────────────────────────────────────────
  "Sydney CBD":            {currency:"AUD",symbol:"A$",psf:[1500,2800],  g:6, y:[2.5,3.5],risk:"Low",   infra:92,liv:92, demand:82,trend:"Bull"},
  "Bondi Beach":           {currency:"AUD",symbol:"A$",psf:[1800,3200],  g:6, y:[2.5,3.5],risk:"Low",   infra:92,liv:96, demand:82,trend:"Bull"},
  "Melbourne CBD":         {currency:"AUD",symbol:"A$",psf:[1000,1800],  g:5, y:[3.0,4.5],risk:"Low",   infra:90,liv:90, demand:80,trend:"Stable"},
  "Brisbane CBD":          {currency:"AUD",symbol:"A$",psf:[700,1200],   g:8, y:[3.5,5.0],risk:"Low",   infra:85,liv:85, demand:82,trend:"Strong Bull"},
  "Perth CBD":             {currency:"AUD",symbol:"A$",psf:[600,1000],   g:9, y:[4.0,6.0],risk:"Low",   infra:82,liv:82, demand:80,trend:"Strong Bull"},
  "Gold Coast":            {currency:"AUD",symbol:"A$",psf:[700,1200],   g:7, y:[3.5,5.0],risk:"Low",   infra:82,liv:85, demand:80,trend:"Bull"},
};

// ─── Interest rate by currency (EMI calculator default) ──────────────────────
const INTEREST: Record<string, number> = {
  INR:8.75, AED:4.99, GBP:4.5, USD:7.0, SGD:3.75, CAD:5.5, AUD:6.25
};

// ─── Property type multipliers ────────────────────────────────────────────────
const TYPE: Record<string, { price:number; yield:number; label:string }> = {
  apartment:  {price:1.00, yield:1.00, label:"Apartment"},
  villa:      {price:1.35, yield:0.75, label:"Villa"},
  plot:       {price:0.65, yield:0.00, label:"Plot / Land"},
  farmland:   {price:0.30, yield:0.10, label:"Farm Land"},
  commercial: {price:1.25, yield:1.50, label:"Commercial"},
};

// ─── GET → location names for autocomplete ───────────────────────────────────
export async function GET() {
  return NextResponse.json({ names: Object.keys(LOCATIONS).sort() });
}

// ─── POST → full valuation ───────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const { location, sqft, propertyType = "apartment" } = await req.json();

    const key = Object.keys(LOCATIONS).find(
      (k) => k.toLowerCase() === String(location ?? "").toLowerCase()
    );
    if (!key) {
      return NextResponse.json(
        { error: `"${location}" is not in our database. Select a location from the suggestions.` },
        { status: 404 }
      );
    }

    const area = Number(sqft);
    if (!area || area <= 0) {
      return NextResponse.json({ error: "Please enter a valid area." }, { status: 400 });
    }

    const d  = LOCATIONS[key];
    const tm = TYPE[propertyType] ?? TYPE.apartment;

    const midPsf       = Math.round(((d.psf[0] + d.psf[1]) / 2) * tm.price);
    const currentValue = midPsf * area;
    const minValue     = Math.round(d.psf[0] * tm.price * area);
    const maxValue     = Math.round(d.psf[1] * tm.price * area);

    // 5-year history: 2021 → 2026 (6 points)
    const history = Array.from({ length: 6 }, (_, i) => {
      const yr   = 2021 + i;
      const back = 2026 - yr;
      return { year: yr, value: Math.round(currentValue / Math.pow(1 + d.g / 100, back)) };
    });

    // 5-year forecast: 2026 → 2030 (slight growth taper)
    let fv = currentValue;
    const forecast = [{ year: 2026, value: currentValue, growth: 0 }];
    for (let i = 1; i <= 4; i++) {
      const gr = parseFloat(Math.max(2, d.g - i * 0.3).toFixed(1));
      fv = Math.round(fv * (1 + gr / 100));
      forecast.push({ year: 2026 + i, value: fv, growth: gr });
    }

    const fiveYrAppreciation = parseFloat(
      (((forecast[4].value - currentValue) / currentValue) * 100).toFixed(1)
    );
    const rentalYield = parseFloat(
      (((d.y[0] + d.y[1]) / 2) * tm.yield).toFixed(2)
    );

    // Scores
    const riskPenalty: Record<Risk, number> = { Low:0, Medium:10, High:20, "Very High":30 };
    const rp = riskPenalty[d.risk];
    const buyScore  = Math.min(100, Math.max(0, Math.round(d.demand * 0.9 + d.g * 1.8 - rp)));
    const holdScore = Math.min(100, Math.max(0, 75 - Math.round(rp * 0.4)));
    const sellScore = Math.min(100, Math.max(0, 108 - buyScore));
    const aiScore   = Math.round(d.demand * 0.4 + d.infra * 0.3 + d.liv * 0.3);
    const recommendation: "BUY" | "HOLD" | "SELL" =
      buyScore >= 75 ? "BUY" : buyScore >= 55 ? "HOLD" : "SELL";

    // Comparables: same currency, closest avg PSF
    const myMid = (d.psf[0] + d.psf[1]) / 2;
    const comparables = Object.entries(LOCATIONS)
      .filter(([n, l]) => n !== key && l.currency === d.currency)
      .map(([n, l])  => ({ n, diff: Math.abs((l.psf[0] + l.psf[1]) / 2 - myMid) }))
      .sort((a, b)   => a.diff - b.diff)
      .slice(0, 3)
      .map(({ n }) => {
        const c = LOCATIONS[n];
        return {
          name: n,
          currency: c.currency,
          symbol:   c.symbol,
          pricePerSqft: Math.round((c.psf[0] + c.psf[1]) / 2),
          growth:   c.g,
          risk:     c.risk,
          trend:    c.trend,
          yield:    parseFloat(((c.y[0] + c.y[1]) / 2).toFixed(1)),
        };
      });

    return NextResponse.json({
      location: key,
      currency: d.currency,
      symbol: d.symbol,
      currentValue, pricePerSqft: midPsf, minValue, maxValue,
      history, forecast, fiveYrAppreciation,
      aiScore, buyScore, holdScore, sellScore, recommendation,
      rentalYield, riskLevel: d.risk,
      infraScore: d.infra, livabilityScore: d.liv, demandScore: d.demand,
      marketTrend: d.trend, annualGrowth: d.g,
      comparables,
      defaultInterestRate: INTEREST[d.currency] ?? 7,
      propertyTypeLabel: tm.label,
      disclaimer:
        "AI-generated data from public sources. Indicative only. Verify before any property decision.",
    });
  } catch (err) {
    console.error("[ai-valuation]", err);
    return NextResponse.json({ error: "Valuation failed. Please try again." }, { status: 500 });
  }
}
