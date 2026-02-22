import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DashboardMetrics } from "@/components/dashboard/DashboardMetrics";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { RevenueChart } from "@/components/dashboard/RevenueChart";
import { NotificationCenter } from "@/components/dashboard/NotificationCenter";
import { SettingsModal } from "@/components/SettingsModal";
import { useNotifications } from "@/contexts/NotificationContext";
import { motion } from "framer-motion";
import { io, Socket } from "socket.io-client";
import {
  User,
  MapPin,
  Phone,
  Mail,
  Calendar,
  TrendingUp,
  Camera,
  ShoppingCart,
  Bell,
  Settings,
  Leaf,
  Star,
  Edit,
  Trash2,
  Trophy,
  Award,
  Crown,
  Target,
  Zap,
  Flame,
  Home,
  BarChart3,
  Activity,
  DollarSign,
  Tractor,
  Calendar as CalendarIcon,
  Wrench,
  Sidebar,
  Truck,
  Package,
  Clock,
  CheckCircle,
  AlertCircle,
  Filter
} from "lucide-react";
import { FarmFieldMapping } from "@/components/dashboard/FarmFieldMapping";
import { FinancialManagement } from "@/components/dashboard/FinancialManagement";
import { CropPlanningCalendar } from "@/components/dashboard/CropPlanningCalendar";
import { EquipmentManagement } from "@/components/dashboard/EquipmentManagement";
import { ProductManagement } from "@/components/ProductManagement";
import { useAuth } from "@/contexts/AuthContext";
import { getBlockchainTransactions, type BlockchainTransactionHistoryItem } from "@/services/blockchainBackend";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

// Backend API base URL
const BACKEND_BASE_URL = import.meta.env.VITE_BACKEND_URL || '';
import {
  ResponsiveContainer,
  BarChart,
  LineChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Bar,
  Line
} from "recharts";

interface DetectionResult {
  class: string;
  confidence: number;
  bbox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  timestamp: string;
}

const CAMERA_URL = import.meta.env.VITE_IP_CAMERA_URL || 'http://100.77.28.237:8080';

const MOCK_TRANSACTIONS: BlockchainTransactionHistoryItem[] = [
  {
    transactionHash: "0x8f2d...3a1c",
    blockNumber: 15432123,
    fromAddress: "0x71C...9A2b",
    toAddress: "0x456...def",
    amount: 25000,
    currency: "INR",
    transactionType: "payment",
    status: "confirmed",
    network: "Polygon",
    timestamp: new Date().toISOString(),
    explorerUrl: "#",
  },
  {
    transactionHash: "0x3b1e...9c4d",
    blockNumber: 15432089,
    fromAddress: "0xBuyerWallet",
    toAddress: "0xEscrowContract",
    amount: 12500,
    currency: "INR",
    transactionType: "escrow",
    status: "pending",
    network: "Polygon",
    timestamp: new Date(Date.now() - 86400000).toISOString(),
    explorerUrl: "#",
  },
  {
    transactionHash: "0x1a9b...7d2e",
    blockNumber: 15431950,
    fromAddress: "0xMarketplace",
    toAddress: "0xFarmerWallet",
    amount: 4500,
    currency: "INR",
    transactionType: "refund",
    status: "failed",
    network: "Polygon",
    timestamp: new Date(Date.now() - 172800000).toISOString(),
    explorerUrl: "#",
  }
];

export default function UserProfile() {
  const { user } = useAuth();
  const { addNotification } = useNotifications();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [cameraRefreshKey, setCameraRefreshKey] = useState(0);
  const [cameraError, setCameraError] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [showAllCertifications, setShowAllCertifications] = useState(false);

  // Previous transactions (blockchain/payment transparency)
  const [previousTransactions, setPreviousTransactions] = useState<BlockchainTransactionHistoryItem[]>([]);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [transactionsError, setTransactionsError] = useState<string | null>(null);
  
  // Detection state
  const [detectionRunning, setDetectionRunning] = useState(false);
  const [detections, setDetections] = useState<DetectionResult[]>([]);
  const [detectionHistory, setDetectionHistory] = useState<DetectionResult[]>([]);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [detectionStatus, setDetectionStatus] = useState<'idle' | 'connecting' | 'running' | 'error'>('idle');
  const cameraRef = useRef<HTMLDivElement>(null);
  
  const [farmerData, setFarmerData] = useState({
    name: "Rajesh Kumar Sharma",
    location: "Village Rampur, District Sangrur, Punjab",
    phone: "+91 98765 43210",
    email: "rajesh.farmer@gmail.com",
    joinDate: "March 2023",
    farmSize: "15 acres",
    crops: ["Wheat", "Rice", "Sugarcane", "Cotton", "Maize"],
    experience: "12 years",
    farmType: "Family-owned farm",
    irrigationType: "Canal + Borewell",
    soilType: "Alluvial Soil",
    certifications: ["Organic Farming Certified", "GAP Certified"],
    bankAccount: "XXXX-XXXX-1234",
    aadharNumber: "XXXX-XXXX-5678",
    panNumber: "ABCDE1234F",
    totalRevenue: "₹12,50,000",
    monthlyIncome: "₹85,000",
    outstandingLoans: "₹2,50,000",
    insuranceCoverage: "₹8,00,000"
  });

  // CRUD for crops
  const [newCrop, setNewCrop] = useState("");
  const [editCropIdx, setEditCropIdx] = useState<number|null>(null);
  const [editCropName, setEditCropName] = useState("");

  const handleAddCrop = () => {
    if (newCrop.trim()) {
      setFarmerData({ ...farmerData, crops: [...farmerData.crops, newCrop.trim()] });
      setNewCrop("");
    }
  };
  const handleEditCrop = (idx: number) => {
    setEditCropIdx(idx);
    setEditCropName(farmerData.crops[idx]);
  };
  const handleUpdateCrop = () => {
    if (editCropIdx !== null && editCropName.trim()) {
      const updatedCrops = [...farmerData.crops];
      updatedCrops[editCropIdx] = editCropName.trim();
      setFarmerData({ ...farmerData, crops: updatedCrops });
      setEditCropIdx(null);
      setEditCropName("");
    }
  };
  const handleDeleteCrop = (idx: number) => {
    setFarmerData({ ...farmerData, crops: farmerData.crops.filter((_, i) => i !== idx) });
  };

  // Camera functions
  const handleRefreshCamera = () => {
    setCameraRefreshKey(prev => prev + 1);
    setCameraError(false);
  };

  const handleCameraError = () => {
    setCameraError(true);
  };

  // Detection functions
  const startDetection = async () => {
    try {
      setDetectionStatus('connecting');
      const response = await fetch(`${BACKEND_BASE_URL}/api/detection/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cameraUrl: CAMERA_URL,
        }),
      });

      if (response.ok) {
        setDetectionRunning(true);
        setDetectionStatus('running');
      } else {
        throw new Error('Failed to start detection');
      }
    } catch (error) {
      console.error('Error starting detection:', error);
      setDetectionStatus('error');
    }
  };

  const stopDetection = async () => {
    try {
      const response = await fetch(`${BACKEND_BASE_URL}/api/detection/stop`, {
        method: 'POST',
      });

      if (response.ok) {
        setDetectionRunning(false);
        setDetectionStatus('idle');
        setDetections([]);
      } else {
        throw new Error('Failed to stop detection');
      }
    } catch (error) {
      console.error('Error stopping detection:', error);
      setDetectionStatus('error');
    }
  };

  const getDetectionStatus = async () => {
    try {
      const response = await fetch(`${BACKEND_BASE_URL}/api/detection/status`);
      if (response.ok) {
        const status = await response.json();
        setDetectionRunning(status.running);
        setDetectionStatus(status.running ? 'running' : 'idle');
      }
    } catch (error) {
      console.error('Error getting detection status:', error);
    }
  };

  // WebSocket connection for real-time detection updates
  useEffect(() => {
    console.log('🔌 Setting up WebSocket connection for detection...');
    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3002';
    console.log('🌐 Connecting to backend URL:', backendUrl);
    
    const socketConnection = io(backendUrl);
    console.log('📡 Socket.IO instance created');
    
    socketConnection.on('connect', () => {
      console.log('✅ Connected to detection server');
      // Subscribe to detection events
      socketConnection.emit('subscribe-detection');
      console.log('📨 Subscribed to detection events');
      setDetectionStatus(prev => prev === 'connecting' ? 'running' : prev);
    });

    socketConnection.on('connect_error', (error) => {
      console.error('❌ WebSocket connection error:', error);
    });

    socketConnection.on('disconnect', () => {
      console.log('🔌 Disconnected from detection server');
      setDetectionStatus('idle');
    });

    socketConnection.on('detection', (data: DetectionResult | DetectionResult[]) => {
      console.log('🎯 Detection event received:', data);
      // Handle both single detection and array of detections
      const detectionArray = Array.isArray(data) ? data : [data];
      console.log('📊 Processing', detectionArray.length, 'detection(s)');
      
      // Convert normalized coordinates (0-1) to percentage (0-100)
      const normalizedDetections = detectionArray.map(det => ({
        ...det,
        bbox: {
          x: det.bbox.x * 100,
          y: det.bbox.y * 100,
          width: det.bbox.width * 100,
          height: det.bbox.height * 100
        }
      }));
      
      console.log('🔄 Normalized detections:', normalizedDetections);
      setDetections(normalizedDetections);
      setDetectionHistory(prev => [...normalizedDetections, ...prev].slice(0, 10)); // Keep last 10 detections
      
      // Add notifications for detected animals
      normalizedDetections.forEach(detection => {
        console.log('🔔 Adding notification for:', detection.class);
        if (detection.class.toLowerCase().includes('elephant')) {
          addNotification({
            type: 'system',
            priority: 'urgent',
            title: 'Elephant Detected!',
            message: `An elephant has been detected on your farm with ${(detection.confidence * 100).toFixed(1)}% confidence. Please take immediate safety precautions.`,
            autoHide: false,
            icon: '🐘'
          });
        } else {
          addNotification({
            type: 'system',
            priority: 'high',
            title: 'Animal Detected',
            message: `A ${detection.class} has been detected on your farm with ${(detection.confidence * 100).toFixed(1)}% confidence.`,
            autoHide: true,
            hideAfter: 10000,
            icon: '🔍'
          });
        }
      });
      
      // Auto-clear detections after 3 seconds so bounding boxes don't persist
      setTimeout(() => {
        setDetections([]);
      }, 3000);
    });

    socketConnection.on('detection-error', (error: { message: string; code?: string }) => {
      console.error('Detection error:', error);
      setDetectionStatus('error');
    });

    setSocket(socketConnection);

    return () => {
      socketConnection.emit('unsubscribe-detection');
      socketConnection.disconnect();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadTransactions = async () => {
      try {
        setTransactionsLoading(true);
        setTransactionsError(null);

        const result = await getBlockchainTransactions({
          userId: user?._id || 'demo-farmer-1',
          limit: 10
        });

        if (!cancelled) {
          if (result.transactions && result.transactions.length > 0) {
            setPreviousTransactions(result.transactions);
          } else {
            // Fallback to mock data for demo
            setPreviousTransactions(MOCK_TRANSACTIONS);
          }
        }
      } catch (error) {
        if (!cancelled) {
          console.warn("Failed to load transactions, using mock data", error);
          setPreviousTransactions(MOCK_TRANSACTIONS);
          // Clear error so UI renders the table
          setTransactionsError(null);
        }
      } finally {
        if (!cancelled) setTransactionsLoading(false);
      }
    };

    loadTransactions();
    return () => {
      cancelled = true;
    };
  }, [user?._id]);

  // CRUD for activities
  const [activities, setActivities] = useState([
    {
      type: "diagnosis",
      title: "Wheat Disease Detected - Leaf Rust",
      description: "AI analysis detected early leaf rust in North Field. Recommended fungicide application within 48 hours.",
      date: "2 days ago",
      status: "resolved",
      icon: Camera,
      iconBg: "bg-red-100",
      iconColor: "text-red-600",
      time: "2 days ago",
      category: "Diagnosis",
      details: "Treatment cost: ₹2,500",
      amount: "₹2,500"
    },
    {
      type: "market",
      title: "Rice Crop Sold Successfully",
      description: "5 quintal PR-126 rice sold at ₹3,200/quintal to local mandi. Total revenue: ₹16,000.",
      date: "1 week ago",
      status: "completed",
      icon: ShoppingCart,
      iconBg: "bg-green-100",
      iconColor: "text-green-600",
      time: "1 week ago",
      category: "Sales",
      details: "Quality grade: A+",
      amount: "₹16,000"
    },
    {
      type: "purchase",
      title: "Fertilizer Purchase - NPK 50kg",
      description: "Purchased NPK 20-20-20 fertilizer for wheat crop. Cost: ₹2,800.",
      date: "2 weeks ago",
      status: "delivered",
      icon: Package,
      iconBg: "bg-blue-100",
      iconColor: "text-blue-600",
      time: "2 weeks ago",
      category: "Purchase",
      details: "Supplier: AgriChem Distributors",
      amount: "₹2,800"
    },
    {
      type: "maintenance",
      title: "Tractor Maintenance Completed",
      description: "Mahindra 575 DI tractor serviced. Oil change, filter replacement, and brake adjustment.",
      date: "3 weeks ago",
      status: "completed",
      icon: Wrench,
      iconBg: "bg-orange-100",
      iconColor: "text-orange-600",
      time: "3 weeks ago",
      category: "Maintenance",
      details: "Cost: ₹4,200",
      amount: "₹4,200"
    },
    {
      type: "weather",
      title: "Weather Alert - Heavy Rainfall",
      description: "Heavy rainfall expected (150mm) in next 24 hours. Protected crops with tarpaulin.",
      date: "1 month ago",
      status: "completed",
      icon: AlertCircle,
      iconBg: "bg-yellow-100",
      iconColor: "text-yellow-600",
      time: "1 month ago",
      category: "Weather",
      details: "No damage reported",
      amount: null
    },
    {
      type: "subsidy",
      title: "PM-KISAN Payment Received",
      description: "₹6,000 received under PM-KISAN scheme for quarter 3.",
      date: "1 month ago",
      status: "completed",
      icon: DollarSign,
      iconBg: "bg-green-100",
      iconColor: "text-green-600",
      time: "1 month ago",
      category: "Subsidy",
      details: "Total annual benefit: ₹24,000",
      amount: "₹6,000"
    },
    {
      type: "training",
      title: "Organic Farming Workshop",
      description: "Attended 2-day organic farming workshop organized by Krishi Vigyan Kendra.",
      date: "2 months ago",
      status: "completed",
      icon: Award,
      iconBg: "bg-purple-100",
      iconColor: "text-purple-600",
      time: "2 months ago",
      category: "Training",
      details: "Learned sustainable practices",
      amount: null
    },
    {
      type: "insurance",
      title: "Crop Insurance Claim Filed",
      description: "Filed insurance claim for hail damage to maize crop. Claim amount: ₹15,000.",
      date: "3 months ago",
      status: "pending",
      icon: CheckCircle,
      iconBg: "bg-gray-100",
      iconColor: "text-gray-600",
      time: "3 months ago",
      category: "Insurance",
      details: "Status: Under review",
      amount: "₹15,000"
    }
  ]);
  const [activityForm, setActivityForm] = useState({
    type: "diagnosis",
    title: "",
    description: "",
    date: "",
    status: "pending"
  });
  const [editActivityIdx, setEditActivityIdx] = useState<number|null>(null);

  const handleAddActivity = () => {
    if (activityForm.title && activityForm.description) {
      const activityTypeConfig = {
        diagnosis: { icon: Camera, iconBg: "bg-red-100", iconColor: "text-red-600", category: "Diagnosis" },
        market: { icon: ShoppingCart, iconBg: "bg-green-100", iconColor: "text-green-600", category: "Sales" },
        purchase: { icon: Package, iconBg: "bg-blue-100", iconColor: "text-blue-600", category: "Purchase" },
        maintenance: { icon: Wrench, iconBg: "bg-orange-100", iconColor: "text-orange-600", category: "Maintenance" },
        weather: { icon: AlertCircle, iconBg: "bg-yellow-100", iconColor: "text-yellow-600", category: "Weather" },
        subsidy: { icon: DollarSign, iconBg: "bg-green-100", iconColor: "text-green-600", category: "Subsidy" },
        training: { icon: Award, iconBg: "bg-purple-100", iconColor: "text-purple-600", category: "Training" },
        insurance: { icon: CheckCircle, iconBg: "bg-gray-100", iconColor: "text-gray-600", category: "Insurance" }
      };

      const config = activityTypeConfig[activityForm.type as keyof typeof activityTypeConfig] || activityTypeConfig.diagnosis;

      setActivities([...activities, { 
        ...activityForm,
        icon: config.icon,
        iconBg: config.iconBg,
        iconColor: config.iconColor,
        time: activityForm.date || "Just now",
        category: config.category,
        details: "",
        amount: null
      }]);
      setActivityForm({ type: "diagnosis", title: "", description: "", date: "", status: "pending" });
    }
  };
  const handleEditActivity = (idx: number) => {
    setEditActivityIdx(idx);
    setActivityForm({ ...activities[idx] });
  };
  const handleUpdateActivity = () => {
    if (editActivityIdx !== null) {
      const activityTypeConfig = {
        diagnosis: { icon: Camera, iconBg: "bg-red-100", iconColor: "text-red-600", category: "Diagnosis" },
        market: { icon: ShoppingCart, iconBg: "bg-green-100", iconColor: "text-green-600", category: "Sales" },
        purchase: { icon: Package, iconBg: "bg-blue-100", iconColor: "text-blue-600", category: "Purchase" },
        maintenance: { icon: Wrench, iconBg: "bg-orange-100", iconColor: "text-orange-600", category: "Maintenance" },
        weather: { icon: AlertCircle, iconBg: "bg-yellow-100", iconColor: "text-yellow-600", category: "Weather" },
        subsidy: { icon: DollarSign, iconBg: "bg-green-100", iconColor: "text-green-600", category: "Subsidy" },
        training: { icon: Award, iconBg: "bg-purple-100", iconColor: "text-purple-600", category: "Training" },
        insurance: { icon: CheckCircle, iconBg: "bg-gray-100", iconColor: "text-gray-600", category: "Insurance" }
      };

      const config = activityTypeConfig[activityForm.type as keyof typeof activityTypeConfig] || activityTypeConfig.diagnosis;

      const updated = [...activities];
      updated[editActivityIdx] = { 
        ...activityForm,
        icon: config.icon,
        iconBg: config.iconBg,
        iconColor: config.iconColor,
        time: activityForm.date || activities[editActivityIdx].time,
        category: config.category,
        details: activities[editActivityIdx].details || "",
        amount: activities[editActivityIdx].amount || null
      };
      setActivities(updated);
      setEditActivityIdx(null);
      setActivityForm({ type: "diagnosis", title: "", description: "", date: "", status: "pending" });
    }
  };
  const handleDeleteActivity = (idx: number) => {
    setActivities(activities.filter((_, i) => i !== idx));
  };

  const stats = [
    { label: "AI Diagnoses", value: "47", icon: Camera, description: "Plant health checks" },
    { label: "Successful Sales", value: "23", icon: ShoppingCart, description: "Market transactions" },
    { label: "Farm Savings", value: "₹1.2L", icon: TrendingUp, description: "Cost optimizations" },
    { label: "Farm Rating", value: "4.8", icon: Star, description: "Buyer feedback" },
    { label: "Active Fields", value: "3", icon: Leaf, description: "Under cultivation" },
    { label: "Equipment", value: "5", icon: Tractor, description: "Farm machinery" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 pb-20 md:pb-8 lg:pb-8">
      {/* Animated Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-gradient-to-r from-primary via-primary/90 to-primary/80 text-primary-foreground p-6 md:p-8 relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMiIgZmlsbD0iI2ZmZiIgZmlsbC1vcGFjaXR5PSIwLjEiLz48L3N2Zz4=')] opacity-30"></div>
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold mb-1 tracking-tight">Farmer Dashboard</h1>
              <p className="text-primary-foreground/80 flex items-center gap-2">
                <Leaf className="h-4 w-4" />
                Your farming journey and achievements
              </p>
            </div>
            <div className="hidden md:flex items-center gap-3">
              <Button 
                variant="secondary" 
                size="sm" 
                className="bg-white/20 hover:bg-white/30 text-white border-white/30"
                onClick={() => setSettingsOpen(true)}
              >
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
              <Button 
                variant="secondary" 
                size="icon"
                className="bg-white/20 hover:bg-white/30 text-white border-white/30"
              >
                <Bell className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </motion.div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 -mt-6 relative z-20">
        {/* Profile Header Card - Always visible */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Card className="shadow-xl border-0 bg-card/95 backdrop-blur-sm mb-8">
            <CardContent className="p-6 md:p-8">
              <div className="flex flex-col lg:flex-row items-start lg:items-center gap-6">
                {/* Avatar and Basic Info */}
                <div className="flex items-center gap-5">
                  <div className="relative group">
                    <Avatar className="w-24 h-24 ring-4 ring-primary/20 shadow-lg transition-transform group-hover:scale-105">
                      <AvatarFallback className="text-xl font-bold bg-gradient-to-br from-primary to-primary/70 text-primary-foreground">
                        {farmerData.name.split(" ").map(n => n[0]).join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute -bottom-1 -right-1 bg-success rounded-full p-1.5 shadow-md">
                      <CheckCircle className="h-4 w-4 text-white" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h2 className="text-2xl font-bold tracking-tight">{farmerData.name}</h2>
                      <Badge className="bg-success/90 text-success-foreground hover:bg-success shadow-sm flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" />
                        Verified Farmer
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-4 w-4 text-primary" />
                      <span className="text-sm">{farmerData.location}</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5 text-primary/70" />
                        Since {farmerData.joinDate}
                      </span>
                      <span className="flex items-center gap-1">
                        <Leaf className="h-3.5 w-3.5 text-primary/70" />
                        {farmerData.farmSize}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Quick Profile Stats & Actions */}
                <div className="flex-1 w-full lg:w-auto">
                  <div className="grid grid-cols-3 gap-4 lg:ml-auto lg:w-fit mb-4">
                    <div className="text-center p-3 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/10">
                      <p className="text-2xl font-bold text-primary">{farmerData.experience}</p>
                      <p className="text-xs text-muted-foreground">Experience</p>
                    </div>
                    <div className="text-center p-3 rounded-xl bg-gradient-to-br from-success/10 to-success/5 border border-success/10">
                      <p className="text-2xl font-bold text-success">{farmerData.monthlyIncome}</p>
                      <p className="text-xs text-muted-foreground">Monthly</p>
                    </div>
                    <div className="text-center p-3 rounded-xl bg-gradient-to-br from-amber-500/10 to-amber-500/5 border border-amber-500/10">
                      <p className="text-2xl font-bold text-amber-600">4.8</p>
                      <p className="text-xs text-muted-foreground flex items-center justify-center gap-0.5">
                        <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                        Rating
                      </p>
                    </div>
                  </div>
                  <div className="flex lg:justify-end gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setIsEditingProfile(true)}
                      className="flex-1 lg:flex-none"
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Profile
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="lg:hidden"
                      onClick={() => setSettingsOpen(true)}
                    >
                      <Settings className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Contact Info Section */}
              <div className="mt-6 pt-6 border-t border-border/50">
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <motion.a 
                    href={`tel:${farmerData.phone}`}
                    whileHover={{ scale: 1.02 }}
                    className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
                  >
                    <div className="p-2 rounded-full bg-primary/10">
                      <Phone className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Phone</p>
                      <p className="font-medium text-sm">{farmerData.phone}</p>
                    </div>
                  </motion.a>
                  <motion.a 
                    href={`mailto:${farmerData.email}`}
                    whileHover={{ scale: 1.02 }}
                    className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
                  >
                    <div className="p-2 rounded-full bg-primary/10">
                      <Mail className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Email</p>
                      <p className="font-medium text-sm truncate">{farmerData.email}</p>
                    </div>
                  </motion.a>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <div className="p-2 rounded-full bg-primary/10">
                      <Home className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Farm Type</p>
                      <p className="font-medium text-sm">{farmerData.farmType}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Additional Farm Details */}
              <div className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 text-sm">
                  <Zap className="h-4 w-4 text-blue-500" />
                  <span className="text-muted-foreground">Soil:</span>
                  <span className="font-medium">{farmerData.soilType}</span>
                </div>
                <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 text-sm">
                  <Activity className="h-4 w-4 text-cyan-500" />
                  <span className="text-muted-foreground">Irrigation:</span>
                  <span className="font-medium truncate">{farmerData.irrigationType}</span>
                </div>
                <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-muted-foreground">Insurance:</span>
                  <span className="font-medium">{farmerData.insuranceCoverage}</span>
                </div>
                <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 text-sm">
                  <DollarSign className="h-4 w-4 text-amber-500" />
                  <span className="text-muted-foreground">Revenue:</span>
                  <span className="font-medium">{farmerData.totalRevenue}</span>
                </div>
              </div>

              {/* Certifications */}
              <div className="mt-4">
                <div className="flex items-center gap-2 mb-2">
                  <Award className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Certifications</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {farmerData.certifications.slice(0, showAllCertifications ? undefined : 3).map((cert, idx) => (
                    <Badge 
                      key={idx} 
                      variant="secondary" 
                      className="text-xs bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 hover:border-primary/40 transition-colors"
                    >
                      <Trophy className="h-3 w-3 mr-1 text-amber-500" />
                      {cert}
                    </Badge>
                  ))}
                  {farmerData.certifications.length > 3 && !showAllCertifications && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setShowAllCertifications(true)}
                      className="text-xs h-6 px-2"
                    >
                      +{farmerData.certifications.length - 3} more
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Main Content with Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="hidden lg:inline-flex w-full lg:w-auto bg-muted/50 backdrop-blur-sm p-1 border shadow-sm">
            <TabsTrigger 
              value="overview" 
              className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm px-4 py-2.5 rounded-lg transition-all"
            >
              <Home className="h-4 w-4" />
              <span>Overview</span>
            </TabsTrigger>
            <TabsTrigger 
              value="farm" 
              className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm px-4 py-2.5 rounded-lg transition-all"
            >
              <Tractor className="h-4 w-4" />
              <span>Farm</span>
            </TabsTrigger>
            <TabsTrigger 
              value="insights" 
              className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm px-4 py-2.5 rounded-lg transition-all"
            >
              <BarChart3 className="h-4 w-4" />
              <span>Insights</span>
            </TabsTrigger>
            <TabsTrigger 
              value="financial" 
              className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm px-4 py-2.5 rounded-lg transition-all"
            >
              <DollarSign className="h-4 w-4" />
              <span>Financial</span>
            </TabsTrigger>
            <TabsTrigger 
              value="sell" 
              className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm px-4 py-2.5 rounded-lg transition-all"
            >
              <Truck className="h-4 w-4" />
              <span>Sell</span>
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6 mt-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="space-y-6"
            >
              {/* Quick Actions */}
              <QuickActions userType="farmer" />

              {/* Dashboard Metrics */}
              <DashboardMetrics userType="farmer" />
            </motion.div>
          </TabsContent>

          {/* Farm Management Tab */}
          <TabsContent value="farm" className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="space-y-6"
            >
              {/* Farm Information */}
              <Card className="shadow-lg border-0 overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent border-b">
                  <CardTitle className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Leaf className="h-5 w-5 text-primary" />
                    </div>
                    Farm Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid md:grid-cols-3 gap-8">
                    <div className="text-center p-6 rounded-xl bg-gradient-to-br from-primary/5 to-transparent border border-primary/10">
                      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-3">
                        <Leaf className="h-6 w-6 text-primary" />
                      </div>
                      <p className="text-3xl font-bold text-primary">{farmerData.farmSize}</p>
                      <p className="text-sm text-muted-foreground mt-1">Total Farm Size</p>
                    </div>
                    <div className="text-center p-6 rounded-xl bg-gradient-to-br from-amber-500/5 to-transparent border border-amber-500/10">
                      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-amber-500/10 mb-3">
                        <Trophy className="h-6 w-6 text-amber-500" />
                      </div>
                      <p className="text-3xl font-bold text-amber-600">{farmerData.experience}</p>
                      <p className="text-sm text-muted-foreground mt-1">Farming Experience</p>
                    </div>
                    <div className="p-6 rounded-xl bg-gradient-to-br from-green-500/5 to-transparent border border-green-500/10">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-semibold flex items-center gap-2">
                          <Leaf className="h-4 w-4 text-green-500" />
                          Active Crops
                        </h4>
                        <Badge variant="secondary" className="bg-green-500/10 text-green-600">
                          {farmerData.crops.length} crops
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-2 mb-4">
                        {farmerData.crops.map((crop, idx) => (
                          <div key={crop} className="group relative">
                            {editCropIdx === idx ? (
                              <div className="flex items-center gap-2 p-2 rounded-lg bg-muted border">
                                <input 
                                  value={editCropName} 
                                  onChange={e => setEditCropName(e.target.value)} 
                                  className="border border-border rounded-md px-3 py-1.5 text-sm bg-background text-foreground w-28 focus:ring-2 focus:ring-primary/20 focus:outline-none" 
                                  placeholder="Crop name"
                                  autoFocus
                                />
                                <Button size="sm" variant="default" onClick={handleUpdateCrop} className="h-8">
                                  <CheckCircle className="h-3 w-3" />
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => { setEditCropIdx(null); setEditCropName(""); }} className="h-8 text-muted-foreground">
                                  Cancel
                                </Button>
                              </div>
                            ) : (
                              <Badge 
                                variant="secondary" 
                                className="pr-1 pl-3 py-1.5 bg-green-500/10 hover:bg-green-500/20 text-green-700 border border-green-500/20 transition-all group"
                              >
                                {crop}
                                <span className="ml-2 inline-flex gap-0.5">
                                  <Button 
                                    size="sm" 
                                    variant="ghost" 
                                    onClick={() => handleEditCrop(idx)} 
                                    className="h-5 w-5 p-0 hover:bg-green-500/20 opacity-60 group-hover:opacity-100"
                                  >
                                    <Edit className="h-3 w-3" />
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    variant="ghost" 
                                    onClick={() => handleDeleteCrop(idx)} 
                                    className="h-5 w-5 p-0 hover:bg-destructive/20 text-destructive/70 hover:text-destructive opacity-60 group-hover:opacity-100"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </span>
                              </Badge>
                            )}
                          </div>
                        ))}
                      </div>
                      <div className="flex items-center gap-2 pt-3 border-t border-dashed">
                        <input 
                          value={newCrop} 
                          onChange={e => setNewCrop(e.target.value)} 
                          placeholder="Add new crop..." 
                          className="flex-1 border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:ring-2 focus:ring-primary/20 focus:outline-none" 
                          onKeyPress={(e) => e.key === 'Enter' && handleAddCrop()}
                        />
                        <Button 
                          size="sm" 
                          variant="default" 
                          onClick={handleAddCrop}
                          disabled={!newCrop.trim()}
                          className="shrink-0"
                        >
                          <Leaf className="h-4 w-4 mr-1" />
                          Add
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

            {/* Farm Camera Feed */}
            <Card className="shadow-lg border-0 overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-blue-500/5 to-transparent border-b">
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-blue-500/10">
                      <Camera className="h-5 w-5 text-blue-500" />
                    </div>
                    Farm Camera Live Feed
                  </div>
                  <div className="flex items-center gap-2">
                    {detectionRunning && (
                      <Badge variant="default" className="bg-green-500 animate-pulse">
                        <span className="w-2 h-2 rounded-full bg-white mr-2"></span>
                        AI Active
                      </Badge>
                    )}
                    <Badge variant="outline" className="text-xs">
                      <Clock className="h-3 w-3 mr-1" />
                      {new Date().toLocaleTimeString()}
                    </Badge>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="space-y-0">
                  {/* Camera View */}
                  <div className="bg-gray-900 overflow-hidden">
                    <div className="relative aspect-video" ref={cameraRef}>
                      {!cameraError ? (
                        <iframe
                          key={cameraRefreshKey}
                          src={CAMERA_URL}
                          className="w-full h-full border-0"
                          title="Farm Camera Live Feed"
                          allowFullScreen
                          onError={handleCameraError}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900 text-white">
                          <div className="text-center space-y-4 p-8">
                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-500/20 mb-2">
                              <AlertCircle className="h-8 w-8 text-red-400" />
                            </div>
                            <div>
                              <p className="text-lg font-semibold">Camera Feed Unavailable</p>
                              <p className="text-sm text-gray-400 mt-1">Unable to connect to camera</p>
                              <p className="text-xs text-gray-500 mt-2 font-mono bg-gray-800 px-3 py-1 rounded inline-block">{CAMERA_URL}</p>
                            </div>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={handleRefreshCamera}
                              className="mt-4 border-gray-600 hover:bg-gray-700"
                            >
                              <Camera className="h-4 w-4 mr-2" />
                              Retry Connection
                            </Button>
                          </div>
                        </div>
                      )}
                      {!cameraError && (
                        <div className="absolute top-3 left-3 flex items-center gap-2">
                          <div className="bg-red-500 text-white px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-2 shadow-lg">
                            <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>
                            LIVE
                          </div>
                          <div className="bg-black/60 backdrop-blur-sm text-white px-3 py-1.5 rounded-full text-xs">
                            North Field Camera
                          </div>
                        </div>
                      )}
                      {/* Detection Overlay */}
                      {detectionRunning && detections.length > 0 && (
                        <div className="absolute inset-0 pointer-events-none">
                          {detections.map((detection, index) => (
                            <motion.div
                              key={`${detection.timestamp}-${index}`}
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              className="absolute border-3 border-red-500 bg-red-500/10 rounded-lg shadow-lg shadow-red-500/30"
                              style={{
                                left: `${detection.bbox.x}%`,
                                top: `${detection.bbox.y}%`,
                                width: `${detection.bbox.width}%`,
                                height: `${detection.bbox.height}%`,
                              }}
                            >
                              <div className="absolute -top-8 left-0 bg-red-500 text-white text-xs px-2 py-1 rounded-full whitespace-nowrap font-medium shadow-lg flex items-center gap-1">
                                <span className="text-lg">🐘</span>
                                Elephant ({Math.round(detection.confidence * 100)}%)
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Camera Controls */}
                  <div className="p-4 bg-muted/30 border-t space-y-4">
                    <div className="flex items-center justify-between flex-wrap gap-4">
                      <div className="flex items-center gap-3">
                        <Button variant="outline" size="sm" onClick={handleRefreshCamera} className="shadow-sm">
                          <Camera className="h-4 w-4 mr-2" />
                          Refresh Feed
                        </Button>
                        <Button variant="outline" size="sm" className="shadow-sm">
                          <Settings className="h-4 w-4 mr-2" />
                          Camera Settings
                        </Button>
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center gap-2">
                        <span className="font-mono bg-muted px-2 py-1 rounded">{CAMERA_URL}</span>
                      </div>
                    </div>

                    {/* Elephant Detection Controls */}
                    <div className="p-4 rounded-xl bg-gradient-to-r from-orange-500/5 to-amber-500/5 border border-orange-500/20">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-semibold flex items-center gap-2">
                          <Target className="h-5 w-5 text-orange-500" />
                          AI Elephant Detection
                        </h4>
                        <Badge 
                          variant={detectionStatus === 'running' ? 'default' : detectionStatus === 'error' ? 'destructive' : 'secondary'}
                          className={detectionStatus === 'running' ? 'bg-green-500 animate-pulse' : ''}
                        >
                          {detectionStatus === 'running' && <span className="w-2 h-2 rounded-full bg-white mr-2"></span>}
                          {detectionStatus === 'running' ? 'Active' : detectionStatus === 'connecting' ? 'Connecting...' : detectionStatus === 'error' ? 'Error' : 'Inactive'}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-4">
                        Real-time AI-powered wildlife detection to protect your crops from elephant intrusions.
                      </p>
                      <div className="flex gap-2">
                        {!detectionRunning ? (
                          <Button 
                            variant="default" 
                            size="sm" 
                            onClick={startDetection}
                            disabled={detectionStatus === 'connecting'}
                            className="bg-orange-500 hover:bg-orange-600 shadow-md"
                          >
                            <Target className="h-4 w-4 mr-2" />
                            Start Detection
                          </Button>
                        ) : (
                          <Button 
                            variant="destructive" 
                            size="sm" 
                            onClick={stopDetection}
                            className="shadow-md"
                          >
                            <AlertCircle className="h-4 w-4 mr-2" />
                            Stop Detection
                          </Button>
                        )}
                        <Button variant="outline" size="sm" onClick={getDetectionStatus}>
                          <Activity className="h-4 w-4 mr-2" />
                          Check Status
                        </Button>
                      </div>
                      {detections.length > 0 && (
                        <motion.div 
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="mt-4 p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg flex items-center gap-3"
                        >
                          <span className="text-2xl">🐘</span>
                          <div>
                            <p className="font-medium text-orange-700">Elephant Detected!</p>
                            <p className="text-sm text-orange-600">{detections.length} detection{detections.length > 1 ? 's' : ''} - Taking protective measures...</p>
                          </div>
                        </motion.div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Detection History */}
            {detectionHistory.length > 0 && (
              <Card className="shadow-lg border-0 overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-orange-500/5 to-transparent border-b">
                  <CardTitle className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-orange-500/10">
                      <Activity className="h-5 w-5 text-orange-500" />
                    </div>
                    Detection History
                    <Badge variant="secondary" className="ml-auto">{detectionHistory.length} events</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                    {detectionHistory.map((detection, index) => (
                      <motion.div 
                        key={`${detection.timestamp}-${index}`} 
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="flex items-center justify-between p-3 bg-gradient-to-r from-orange-500/5 to-amber-500/5 border border-orange-500/20 rounded-xl hover:border-orange-500/40 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-orange-500/10">
                            <span className="text-xl">🐘</span>
                          </div>
                          <div>
                            <p className="font-medium text-sm">Elephant Detected</p>
                            <p className="text-xs text-muted-foreground">
                              Confidence: {Math.round(detection.confidence * 100)}% • 
                              Position: ({Math.round(detection.bbox.x)}, {Math.round(detection.bbox.y)})
                            </p>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          <Clock className="h-3 w-3 mr-1" />
                          {new Date(detection.timestamp).toLocaleTimeString()}
                        </Badge>
                      </motion.div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Farm Field Mapping */}
            <Card className="shadow-lg border-0 overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-green-500/5 to-transparent border-b">
                <CardTitle className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-green-500/10">
                    <MapPin className="h-5 w-5 text-green-500" />
                  </div>
                  Farm Field Mapping
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <FarmFieldMapping />
              </CardContent>
            </Card>

            {/* Crop Planning Calendar */}
            <Card className="shadow-lg border-0 overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-purple-500/5 to-transparent border-b">
                <CardTitle className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-purple-500/10">
                    <CalendarIcon className="h-5 w-5 text-purple-500" />
                  </div>
                  Crop Planning Calendar
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <CropPlanningCalendar />
              </CardContent>
            </Card>

            {/* Equipment Management */}
            <Card className="shadow-lg border-0 overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-amber-500/5 to-transparent border-b">
                <CardTitle className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-amber-500/10">
                    <Wrench className="h-5 w-5 text-amber-500" />
                  </div>
                  Equipment Management
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <EquipmentManagement />
              </CardContent>
            </Card>
            </motion.div>
          </TabsContent>

          {/* Insights Tab - Combined Activities & Analytics */}
          <TabsContent value="insights" className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="space-y-6"
            >
              {/* Key Performance Indicators */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {stats.map((stat, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                  >
                    <Card className="p-4 hover:shadow-lg transition-shadow border-0 bg-gradient-to-br from-card to-muted/30">
                      <div className="flex flex-col items-center text-center gap-2">
                        <div className="p-3 bg-primary/10 rounded-xl">
                          <stat.icon className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold">{stat.value}</p>
                          <p className="text-xs font-medium text-foreground">{stat.label}</p>
                          <p className="text-xs text-muted-foreground">{stat.description}</p>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column - Charts and Data */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Revenue Chart */}
                  <RevenueChart userType="farmer" />

                  {/* Crop Performance Chart */}
                  <Card className="shadow-lg border-0 overflow-hidden">
                    <CardHeader className="bg-gradient-to-r from-purple-500/5 to-transparent border-b">
                      <CardTitle className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-purple-500/10">
                          <BarChart3 className="h-5 w-5 text-purple-500" />
                        </div>
                        Crop Performance
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                      <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={[
                            { name: 'Rice', yield: 85, revenue: 45000 },
                            { name: 'Wheat', yield: 92, revenue: 38000 },
                            { name: 'Cotton', yield: 78, revenue: 52000 },
                            { name: 'Sugarcane', yield: 88, revenue: 65000 },
                          ]}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                            <XAxis dataKey="name" className="text-xs" />
                            <YAxis yAxisId="left" className="text-xs" />
                            <YAxis yAxisId="right" orientation="right" className="text-xs" />
                            <Tooltip 
                              contentStyle={{ 
                                borderRadius: '12px', 
                                border: 'none', 
                                boxShadow: '0 4px 20px rgba(0,0,0,0.1)' 
                              }} 
                            />
                            <Legend />
                            <Bar yAxisId="left" dataKey="yield" fill="#8b5cf6" name="Yield %" radius={[4, 4, 0, 0]} />
                            <Bar yAxisId="right" dataKey="revenue" fill="#22c55e" name="Revenue (₹)" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Monthly Trends */}
                  <Card className="shadow-lg border-0 overflow-hidden">
                    <CardHeader className="bg-gradient-to-r from-blue-500/5 to-transparent border-b">
                      <CardTitle className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-blue-500/10">
                          <TrendingUp className="h-5 w-5 text-blue-500" />
                        </div>
                        Monthly Trends
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                      <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={[
                            { month: 'Jan', sales: 12000, expenses: 8000, profit: 4000 },
                            { month: 'Feb', sales: 15000, expenses: 9000, profit: 6000 },
                            { month: 'Mar', sales: 18000, expenses: 10000, profit: 8000 },
                            { month: 'Apr', sales: 22000, expenses: 12000, profit: 10000 },
                            { month: 'May', sales: 25000, expenses: 14000, profit: 11000 },
                            { month: 'Jun', sales: 28000, expenses: 15000, profit: 13000 },
                          ]}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                            <XAxis dataKey="month" className="text-xs" />
                            <YAxis className="text-xs" />
                            <Tooltip 
                              contentStyle={{ 
                                borderRadius: '12px', 
                                border: 'none', 
                                boxShadow: '0 4px 20px rgba(0,0,0,0.1)' 
                              }} 
                            />
                            <Legend />
                            <Line type="monotone" dataKey="sales" stroke="#8b5cf6" strokeWidth={2} name="Sales" dot={{ fill: '#8b5cf6' }} />
                            <Line type="monotone" dataKey="expenses" stroke="#f97316" strokeWidth={2} name="Expenses" dot={{ fill: '#f97316' }} />
                            <Line type="monotone" dataKey="profit" stroke="#22c55e" strokeWidth={2} name="Profit" dot={{ fill: '#22c55e' }} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Right Column - Sidebar */}
                <div className="space-y-6">
                  {/* Activity Feed */}
                  <ActivityFeed userType="farmer" limit={6} />

                  {/* Notification Center */}
                  <NotificationCenter userType="farmer" />

                  {/* Quick Insights */}
                  <Card className="shadow-lg border-0 overflow-hidden">
                    <CardHeader className="bg-gradient-to-r from-amber-500/5 to-transparent border-b">
                      <CardTitle className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-amber-500/10">
                          <Zap className="h-5 w-5 text-amber-500" />
                        </div>
                        Quick Insights
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 space-y-3">
                      <motion.div 
                        whileHover={{ scale: 1.02 }}
                        className="flex items-center gap-3 p-4 bg-gradient-to-r from-green-500/10 to-green-500/5 rounded-xl border border-green-500/20"
                      >
                        <div className="p-2 rounded-lg bg-green-500/20">
                          <TrendingUp className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-green-700">Revenue Up 15%</p>
                          <p className="text-xs text-green-600">vs last month</p>
                        </div>
                      </motion.div>
                      <motion.div 
                        whileHover={{ scale: 1.02 }}
                        className="flex items-center gap-3 p-4 bg-gradient-to-r from-blue-500/10 to-blue-500/5 rounded-xl border border-blue-500/20"
                      >
                        <div className="p-2 rounded-lg bg-blue-500/20">
                          <Camera className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-blue-700">47 AI Diagnoses</p>
                          <p className="text-xs text-blue-600">This month</p>
                        </div>
                      </motion.div>
                      <motion.div 
                        whileHover={{ scale: 1.02 }}
                        className="flex items-center gap-3 p-4 bg-gradient-to-r from-amber-500/10 to-amber-500/5 rounded-xl border border-amber-500/20"
                      >
                        <div className="p-2 rounded-lg bg-amber-500/20">
                          <Star className="h-5 w-5 text-amber-600 fill-amber-400" />
                        </div>
                        <div>
                          <p className="font-semibold text-amber-700">4.8 Rating</p>
                          <p className="text-xs text-amber-600">Average score</p>
                        </div>
                      </motion.div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Recent Activities Section */}
              <Card className="shadow-lg border-0 overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-gray-500/5 to-transparent border-b">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Activity className="h-5 w-5 text-primary" />
                      </div>
                      Recent Activities
                    </CardTitle>
                    <Button variant="outline" size="sm" className="shadow-sm">
                      <Filter className="h-4 w-4 mr-2" />
                      Filter
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="space-y-3">
                    {activities.map((activity, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 }}
                      >
                        <Card className="p-4 border-0 bg-muted/30 hover:bg-muted/50 transition-colors">
                          <div className="flex items-start gap-4">
                            <div className={`p-2.5 rounded-xl ${activity.iconBg} shrink-0`}>
                              <activity.icon className={`h-5 w-5 ${activity.iconColor}`} />
                            </div>
                            <div className="flex-1 min-w-0 space-y-1">
                              <div className="flex items-start justify-between gap-2">
                                <h4 className="font-semibold text-sm">{activity.title}</h4>
                                <div className="flex items-center gap-2 shrink-0">
                                  <Badge variant="secondary" className="text-xs">
                                    {activity.category}
                                  </Badge>
                                </div>
                              </div>
                              <p className="text-sm text-muted-foreground line-clamp-2">{activity.description}</p>
                              <div className="flex items-center justify-between pt-1">
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <Clock className="h-3 w-3" />
                                  {activity.time}
                                  {activity.details && (
                                    <span className="text-muted-foreground">• {activity.details}</span>
                                  )}
                                </div>
                                {activity.amount && (
                                  <Badge variant="outline" className="text-xs text-green-600 border-green-500/30 bg-green-500/10">
                                    <DollarSign className="h-3 w-3 mr-0.5" />
                                    {activity.amount}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        </Card>
                      </motion.div>
                    ))}
                  </div>

                  <div className="text-center mt-6">
                    <Button variant="outline" className="shadow-sm">
                      Load More Activities
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {/* Financial Tab */}
          <TabsContent value="financial" className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="space-y-6"
            >
              {/* Transactions Card */}
              <Card className="shadow-lg border-0 overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-indigo-500/5 to-transparent border-b">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <div className="p-2 rounded-lg bg-indigo-500/10">
                        <Package className="h-5 w-5 text-indigo-500" />
                      </div>
                      Blockchain Transactions
                    </CardTitle>
                    <Badge variant="outline" className="text-indigo-600 border-indigo-500/30">
                      Polygon Network
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {transactionsLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-sm text-muted-foreground">Loading transactions...</p>
                      </div>
                    </div>
                  ) : transactionsError ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="flex flex-col items-center gap-3 text-center">
                        <div className="p-3 rounded-full bg-destructive/10">
                          <AlertCircle className="h-6 w-6 text-destructive" />
                        </div>
                        <p className="text-sm text-destructive">{transactionsError}</p>
                      </div>
                    </div>
                  ) : previousTransactions.length === 0 ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="flex flex-col items-center gap-3 text-center">
                        <div className="p-3 rounded-full bg-muted">
                          <Package className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <p className="text-sm text-muted-foreground">No transactions found yet</p>
                        <p className="text-xs text-muted-foreground">Your blockchain transactions will appear here</p>
                      </div>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/30">
                            <TableHead className="font-semibold">Type</TableHead>
                            <TableHead className="font-semibold">Amount</TableHead>
                            <TableHead className="font-semibold">Status</TableHead>
                            <TableHead className="font-semibold">Date</TableHead>
                            <TableHead className="hidden md:table-cell font-semibold">Transaction Hash</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {previousTransactions.map((tx, idx) => (
                            <motion.tr 
                              key={tx.transactionHash}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: idx * 0.05 }}
                              className="border-b hover:bg-muted/30 transition-colors"
                            >
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <div className={`p-1.5 rounded-lg ${
                                    tx.transactionType === 'payment' ? 'bg-green-500/10' :
                                    tx.transactionType === 'escrow' ? 'bg-blue-500/10' :
                                    'bg-amber-500/10'
                                  }`}>
                                    {tx.transactionType === 'payment' ? <DollarSign className="h-4 w-4 text-green-500" /> :
                                     tx.transactionType === 'escrow' ? <Package className="h-4 w-4 text-blue-500" /> :
                                     <AlertCircle className="h-4 w-4 text-amber-500" />}
                                  </div>
                                  <span className="capitalize font-medium">{tx.transactionType}</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <span className="font-semibold text-green-600">₹{Number(tx.amount || 0).toLocaleString()}</span>
                                {tx.currency && <span className="text-xs text-muted-foreground ml-1">{tx.currency}</span>}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant={tx.status === 'confirmed' ? 'default' : tx.status === 'failed' ? 'destructive' : 'secondary'}
                                  className={`capitalize ${
                                    tx.status === 'confirmed' ? 'bg-green-500/90' :
                                    tx.status === 'pending' ? 'bg-amber-500/90' : ''
                                  }`}
                                >
                                  {tx.status === 'confirmed' && <CheckCircle className="h-3 w-3 mr-1" />}
                                  {tx.status === 'pending' && <Clock className="h-3 w-3 mr-1" />}
                                  {tx.status}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1 text-sm">
                                  <Calendar className="h-3 w-3 text-muted-foreground" />
                                  {tx.timestamp ? new Date(tx.timestamp).toLocaleDateString() : '-'}
                                </div>
                              </TableCell>
                              <TableCell className="hidden md:table-cell">
                                {tx.explorerUrl ? (
                                  <a
                                    href={tx.explorerUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1 text-primary hover:underline font-mono text-xs bg-primary/5 px-2 py-1 rounded"
                                    title={tx.transactionHash}
                                  >
                                    {tx.transactionHash.slice(0, 10)}…{tx.transactionHash.slice(-6)}
                                    <Activity className="h-3 w-3" />
                                  </a>
                                ) : (
                                  <span className="text-muted-foreground font-mono text-xs">{tx.transactionHash.slice(0, 10)}…</span>
                                )}
                              </TableCell>
                            </motion.tr>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Financial Management */}
              <Card className="shadow-lg border-0 overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-green-500/5 to-transparent border-b">
                  <CardTitle className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-green-500/10">
                      <DollarSign className="h-5 w-5 text-green-500" />
                    </div>
                    Financial Management
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <FinancialManagement />
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {/* Sell Tab */}
          <TabsContent value="sell" className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <ProductManagement />
            </motion.div>
          </TabsContent>
        </Tabs>

        {/* Mobile Bottom Navigation */}
        <div className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-background/95 backdrop-blur-md border-t border-border shadow-lg">
          <div className="grid grid-cols-5 gap-1 p-2 max-w-md mx-auto">
            {[
              { tab: "overview", icon: Home, label: "Overview" },
              { tab: "farm", icon: Tractor, label: "Farm" },
              { tab: "insights", icon: BarChart3, label: "Insights" },
              { tab: "financial", icon: DollarSign, label: "Financial" },
              { tab: "sell", icon: Truck, label: "Sell" },
            ].map(({ tab, icon: Icon, label }) => (
              <Button
                key={tab}
                variant={activeTab === tab ? "default" : "ghost"}
                size="sm"
                onClick={() => setActiveTab(tab)}
                className={`flex flex-col items-center gap-0.5 h-auto py-2.5 rounded-xl transition-all ${
                  activeTab === tab 
                    ? 'bg-primary text-primary-foreground shadow-md scale-105' 
                    : 'hover:bg-muted'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="text-[10px] font-medium">{label}</span>
              </Button>
            ))}
          </div>
        </div>

        {/* Quick Access Sidebar - Desktop Only */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="fixed right-4 top-1/2 transform -translate-y-1/2 z-40 hidden lg:flex flex-col gap-2"
        >
          <div className="bg-background/95 backdrop-blur-md border border-border rounded-2xl p-2 shadow-xl">
            <div className="flex flex-col gap-1.5">
              {[
                { tab: "overview", icon: Home, label: "Overview" },
                { tab: "farm", icon: Tractor, label: "Farm" },
                { tab: "insights", icon: BarChart3, label: "Insights" },
                { tab: "financial", icon: DollarSign, label: "Financial" },
                { tab: "sell", icon: Truck, label: "Sell" },
              ].map(({ tab, icon: Icon, label }) => (
                <Button
                  key={tab}
                  variant={activeTab === tab ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setActiveTab(tab)}
                  className={`w-11 h-11 p-0 rounded-xl transition-all ${
                    activeTab === tab ? 'shadow-md' : 'hover:bg-muted'
                  }`}
                  title={label}
                >
                  <Icon className="h-5 w-5" />
                </Button>
              ))}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Settings Modal */}
      <SettingsModal open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  );
}