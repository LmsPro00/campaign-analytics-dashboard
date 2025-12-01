import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { PlusCircle, TrendingUp, TrendingDown, Calendar, BarChart3, Download, Sparkles, Trash2, X, Layers, LogOut } from 'lucide-react';
import { db, auth, googleProvider } from './firebase';
import { collection, doc, setDoc, onSnapshot, deleteDoc } from 'firebase/firestore';
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';

const CampaignAnalytics = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [campaigns, setCampaigns] = useState({});
  const [selectedCampaign, setSelectedCampaign] = useState('');
  const [newCampaignName, setNewCampaignName] = useState('');
  const [showNewCampaignInput, setShowNewCampaignInput] = useState(false);
  const [showAggregateModal, setShowAggregateModal] = useState(false);
  const [aggregateConfig, setAggregateConfig] = useState({
    name: '',
    period: '',
    selectedCampaigns: []
  });
  
  const [weekData, setWeekData] = useState({
    weekReference: '',
    date: new Date().toISOString().split('T')[0],
    ctr: '',
    budget: '',
    landingViews: '',
    clicks: '',
    leads: '',
    uniqueLeads: '',
    appointments: '',
    cpc: ''
  });

  // Monitora stato autenticazione
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Carica dati da Firestore in real-time (solo se autenticato)
  // Ogni utente vede solo i suoi dati
  useEffect(() => {
    if (!user) return;
    
    const userCampaignsPath = `users/${user.email}/campaigns`;
    const unsubscribe = onSnapshot(collection(db, userCampaignsPath), (snapshot) => {
      const campaignsData = {};
      snapshot.forEach((doc) => {
        campaignsData[doc.id] = doc.data().weeks || [];
      });
      setCampaigns(campaignsData);
    });

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (Object.keys(campaigns).length > 0) {
      setSelectedCampaign(Object.keys(campaigns)[0]);
    }
  }, [campaigns]);

  const handleGoogleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error('Errore login:', error);
      alert('Errore durante il login. Riprova.');
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Errore logout:', error);
    }
  };

  const addNewCampaign = async () => {
    if (newCampaignName.trim() && user) {
      const userCampaignsPath = `users/${user.email}/campaigns`;
      await setDoc(doc(db, userCampaignsPath, newCampaignName), { weeks: [] });
      setSelectedCampaign(newCampaignName);
      setNewCampaignName('');
      setShowNewCampaignInput(false);
    }
  };

  const deleteCampaign = async (campaignName) => {
    if (window.confirm(`Sei sicuro di voler eliminare la campagna "${campaignName}" e tutto il suo storico?`) && user) {
      const userCampaignsPath = `users/${user.email}/campaigns`;
      await deleteDoc(doc(db, userCampaignsPath, campaignName));
      if (selectedCampaign === campaignName) {
        setSelectedCampaign('');
      }
    }
  };

  const aggregateData = async () => {
    if (aggregateConfig.selectedCampaigns.length === 0 || !aggregateConfig.name || !aggregateConfig.period) {
      alert('Compila tutti i campi per creare l\'aggregazione');
      return;
    }

    // Raccogli tutti i dati delle campagne selezionate
    const allWeeks = [];
    aggregateConfig.selectedCampaigns.forEach(campName => {
      if (campaigns[campName]) {
        allWeeks.push(...campaigns[campName]);
      }
    });

    if (allWeeks.length === 0) {
      alert('Nessun dato disponibile nelle campagne selezionate');
      return;
    }

    // Calcola aggregazioni - SOMME
    const totalBudget = allWeeks.reduce((sum, w) => sum + parseFloat(w.budget || 0), 0);
    const totalClicks = allWeeks.reduce((sum, w) => sum + parseFloat(w.clicks || 0), 0);
    const totalLandingViews = allWeeks.reduce((sum, w) => sum + parseFloat(w.landingViews || 0), 0);
    const totalLeads = allWeeks.reduce((sum, w) => sum + parseFloat(w.leads || 0), 0);
    const totalUniqueLeads = allWeeks.reduce((sum, w) => sum + parseFloat(w.uniqueLeads || 0), 0);
    const totalAppointments = allWeeks.reduce((sum, w) => sum + parseFloat(w.appointments || 0), 0);

    // Medie - CTR, CPC, CPL, CPL Unico, CR Landing, Tasso Presa App
    const avgCTR = (allWeeks.reduce((sum, w) => sum + parseFloat(w.ctr || 0), 0) / allWeeks.length).toFixed(2);
    const avgCPC = (allWeeks.reduce((sum, w) => sum + parseFloat(w.cpc || 0), 0) / allWeeks.length).toFixed(2);
    const avgCPL = (allWeeks.reduce((sum, w) => sum + parseFloat(w.costPerLead || 0), 0) / allWeeks.length).toFixed(2);
    const avgCPLUnique = (allWeeks.reduce((sum, w) => sum + parseFloat(w.costPerUniqueLead || 0), 0) / allWeeks.length).toFixed(2);
    const avgCRLanding = (allWeeks.reduce((sum, w) => sum + parseFloat(w.crLanding || 0), 0) / allWeeks.length).toFixed(2);
    const avgAppointmentRate = (allWeeks.reduce((sum, w) => sum + parseFloat(w.appointmentRate || 0), 0) / allWeeks.length).toFixed(2);

    // Costo/App calcolato dai totali
    const costPerAppointment = totalAppointments > 0 ? (totalBudget / totalAppointments).toFixed(2) : '0.00';

    // Crea la campagna aggregata
    const aggregatedWeek = {
      weekReference: aggregateConfig.period,
      date: new Date().toISOString().split('T')[0],
      weekNumber: 1,
      budget: totalBudget.toFixed(2),
      clicks: totalClicks.toString(),
      ctr: avgCTR,
      cpc: avgCPC,
      landingViews: totalLandingViews.toString(),
      leads: totalLeads.toString(),
      uniqueLeads: totalUniqueLeads.toString(),
      appointments: totalAppointments.toString(),
      costPerLead: avgCPL,
      costPerUniqueLead: avgCPLUnique,
      costPerAppointment,
      crLanding: avgCRLanding,
      appointmentRate: avgAppointmentRate,
      isAggregated: true,
      sourceCampaigns: aggregateConfig.selectedCampaigns
    };

    // Salva come nuova campagna su Firestore (nel workspace dell'utente)
    const aggregateName = `📊 ${aggregateConfig.name}`;
    if (user) {
      const userCampaignsPath = `users/${user.email}/campaigns`;
      await setDoc(doc(db, userCampaignsPath, aggregateName), { weeks: [aggregatedWeek] });
    }

    setSelectedCampaign(aggregateName);
    setShowAggregateModal(false);
    setAggregateConfig({ name: '', period: '', selectedCampaigns: [] });
  };

  const addWeekData = async () => {
    if (!selectedCampaign) return;
    
    // Calcoli automatici
    const budget = parseFloat(weekData.budget) || 0;
    const leads = parseFloat(weekData.leads) || 0;
    const uniqueLeads = parseFloat(weekData.uniqueLeads) || 0;
    const appointments = parseFloat(weekData.appointments) || 0;
    const landingViews = parseFloat(weekData.landingViews) || 0;
    
    const costPerLead = leads > 0 ? (budget / leads).toFixed(2) : '0.00';
    const costPerUniqueLead = uniqueLeads > 0 ? (budget / uniqueLeads).toFixed(2) : '0.00';
    const costPerAppointment = appointments > 0 ? (budget / appointments).toFixed(2) : '0.00';
    const crLanding = landingViews > 0 ? ((leads / landingViews) * 100).toFixed(2) : '0.00';
    const appointmentRate = leads > 0 ? ((appointments / leads) * 100).toFixed(2) : '0.00';
    
    const newWeek = {
      ...weekData,
      weekNumber: campaigns[selectedCampaign].length + 1,
      costPerLead,
      costPerUniqueLead,
      costPerAppointment,
      crLanding,
      appointmentRate
    };
    
    // Salva su Firestore (nel workspace dell'utente)
    const updatedWeeks = [...campaigns[selectedCampaign], newWeek];
    if (user) {
      const userCampaignsPath = `users/${user.email}/campaigns`;
      await setDoc(doc(db, userCampaignsPath, selectedCampaign), { weeks: updatedWeeks });
    }
    
    setWeekData({
      weekReference: '',
      date: new Date().toISOString().split('T')[0],
      ctr: '',
      budget: '',
      landingViews: '',
      clicks: '',
      leads: '',
      uniqueLeads: '',
      appointments: '',
      cpc: ''
    });
  };

  const calculateDelta = (current, previous) => {
    if (!previous || previous === 0) return null;
    const delta = ((current - previous) / previous) * 100;
    return delta.toFixed(2);
  };

  const currentCampaignData = selectedCampaign ? campaigns[selectedCampaign] || [] : [];
  
  const exportData = () => {
    const dataStr = JSON.stringify(campaigns, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'campagne-marketing.json';
    link.click();
  };

  // Schermata di caricamento
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Caricamento...</p>
        </div>
      </div>
    );
  }

  // Schermata di login
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="mb-6">
            <BarChart3 className="mx-auto text-blue-600 mb-4" size={48} />
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Campaign Analytics</h1>
            <p className="text-gray-600">Monitora le performance delle tue campagne marketing</p>
          </div>
          
          <button
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center gap-3 bg-white border-2 border-gray-300 text-gray-700 px-6 py-3 rounded-xl hover:bg-gray-50 hover:border-gray-400 transition-all font-medium"
          >
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Accedi con Google
          </button>
          
          <p className="text-xs text-gray-500 mt-4">
            Solo utenti autorizzati possono accedere
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        
        * {
          font-family: 'Inter', sans-serif;
        }
        
        .card-hover {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        .card-hover:hover {
          transform: translateY(-2px);
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
        }
        
        .input-modern {
          transition: all 0.2s ease;
        }
        
        .input-modern:focus {
          transform: translateY(-1px);
        }
      `}</style>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 py-8 px-4">
        <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-3xl shadow-lg p-8 mb-6 card-hover">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg">
                <BarChart3 className="text-white" size={28} />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Campaign Analytics</h1>
                <p className="text-sm text-gray-600 mt-1 font-medium">Monitora le performance delle tue campagne marketing</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg">
                <img src={user.photoURL} alt={user.displayName} className="w-6 h-6 rounded-full" />
                <span className="text-sm text-gray-700">{user.displayName}</span>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-xl transition-all shadow-sm hover:shadow"
              >
                <LogOut size={18} />
                Esci
              </button>
              <button
                onClick={() => setShowAggregateModal(true)}
                type="button"
                className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-xl hover:from-purple-700 hover:to-purple-800 transition-all shadow-md hover:shadow-lg"
              >
                <Layers size={18} />
                Aggrega i dati
              </button>
              <button
                onClick={exportData}
                className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-xl transition-all"
              >
                <Download size={18} />
                Esporta
              </button>
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="text-blue-600" size={20} />
              <h2 className="text-lg font-semibold text-gray-900">Gestione Campagne</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Seleziona Campagna
                </label>
                <div className="flex gap-2">
                  <select
                    value={selectedCampaign}
                    onChange={(e) => setSelectedCampaign(e.target.value)}
                    className="flex-1 px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 font-medium shadow-sm input-modern"
                  >
                    <option value="">Seleziona una campagna</option>
                    {Object.keys(campaigns).map(camp => (
                      <option key={camp} value={camp}>{camp}</option>
                    ))}
                  </select>
                  {selectedCampaign && (
                    <button
                      onClick={() => deleteCampaign(selectedCampaign)}
                      className="px-3 py-3 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-all shadow-sm hover:shadow"
                      title="Elimina campagna"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nuova Campagna
                </label>
                {!showNewCampaignInput ? (
                  <button
                    onClick={() => setShowNewCampaignInput(true)}
                    className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all flex items-center justify-center gap-2 font-semibold shadow-md hover:shadow-lg"
                  >
                    <PlusCircle size={18} />
                    Aggiungi Campagna
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newCampaignName}
                      onChange={(e) => setNewCampaignName(e.target.value)}
                      placeholder="es. Marketing Senza Soldi"
                      className="flex-1 px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-400 shadow-sm input-modern"
                      onKeyPress={(e) => e.key === 'Enter' && addNewCampaign()}
                      autoFocus
                    />
                  <button
                    onClick={addNewCampaign}
                    className="px-5 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
                  >
                    Crea
                  </button>
                  <button
                    onClick={() => {
                      setShowNewCampaignInput(false);
                      setNewCampaignName('');
                    }}
                    className="px-5 py-3 bg-gray-50 border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-100 transition-colors"
                  >
                    Annulla
                  </button>
                </div>
              )}
            </div>
          </div>
          </div>
        </div>

        {selectedCampaign && (
          <>
            <div className="bg-white rounded-3xl shadow-lg p-8 mb-6 card-hover">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-md">
                  <PlusCircle className="text-white" size={22} />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Aggiungi Dati Settimanali</h2>
                  <p className="text-sm text-gray-600 font-medium">{selectedCampaign}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Settimana di Riferimento</label>
                  <input
                    type="text"
                    value={weekData.weekReference}
                    onChange={(e) => setWeekData({...weekData, weekReference: e.target.value})}
                    placeholder="es. 18-24 Novembre"
                    className="w-full px-4 py-3.5 bg-white border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-400 shadow-sm input-modern font-medium"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Data</label>
                  <input
                    type="date"
                    value={weekData.date}
                    onChange={(e) => setWeekData({...weekData, date: e.target.value})}
                    className="w-full px-4 py-3.5 bg-white border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 shadow-sm input-modern font-medium"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Budget Speso (€)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={weekData.budget}
                    onChange={(e) => setWeekData({...weekData, budget: e.target.value})}
                    placeholder="500"
                    className="w-full px-4 py-3.5 bg-white border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-400 shadow-sm input-modern font-medium"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Click</label>
                  <input
                    type="number"
                    value={weekData.clicks}
                    onChange={(e) => setWeekData({...weekData, clicks: e.target.value})}
                    placeholder="250"
                    className="w-full px-4 py-3.5 bg-white border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-400 shadow-sm input-modern font-medium"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">CTR Medio (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={weekData.ctr}
                    onChange={(e) => setWeekData({...weekData, ctr: e.target.value})}
                    placeholder="2.5"
                    className="w-full px-4 py-3.5 bg-white border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-400 shadow-sm input-modern font-medium"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Visualizzazioni Landing</label>
                  <input
                    type="number"
                    value={weekData.landingViews}
                    onChange={(e) => setWeekData({...weekData, landingViews: e.target.value})}
                    placeholder="150"
                    className="w-full px-4 py-3.5 bg-white border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-400 shadow-sm input-modern font-medium"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Lead Generati</label>
                  <input
                    type="number"
                    value={weekData.leads}
                    onChange={(e) => setWeekData({...weekData, leads: e.target.value})}
                    placeholder="25"
                    className="w-full px-4 py-3.5 bg-white border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-400 shadow-sm input-modern font-medium"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Lead Unici Generati</label>
                  <input
                    type="number"
                    value={weekData.uniqueLeads}
                    onChange={(e) => setWeekData({...weekData, uniqueLeads: e.target.value})}
                    placeholder="20"
                    className="w-full px-4 py-3.5 bg-white border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-400 shadow-sm input-modern font-medium"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Appuntamenti Presi</label>
                  <input
                    type="number"
                    value={weekData.appointments}
                    onChange={(e) => setWeekData({...weekData, appointments: e.target.value})}
                    placeholder="10"
                    className="w-full px-4 py-3.5 bg-white border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-400 shadow-sm input-modern font-medium"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">CPC Medio (€)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={weekData.cpc}
                    onChange={(e) => setWeekData({...weekData, cpc: e.target.value})}
                    placeholder="2.00"
                    className="w-full px-4 py-3.5 bg-white border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-400 shadow-sm input-modern font-medium"
                  />
                </div>

                <div className="md:col-span-3 mt-6 p-6 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl border-2 border-emerald-100">
                  <div className="flex items-center gap-2 mb-4">
                    <TrendingUp className="text-emerald-600" size={20} />
                    <p className="text-gray-900 text-sm font-semibold">Metriche Calcolate Automaticamente</p>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div>
                      <div className="text-gray-500 text-xs mb-0.5">CR Landing</div>
                      <div className="font-semibold text-gray-900 text-lg">{weekData.landingViews && weekData.leads ? ((parseFloat(weekData.leads) / parseFloat(weekData.landingViews)) * 100).toFixed(2) : '0.00'}%</div>
                    </div>
                    <div>
                      <div className="text-gray-500 text-xs mb-0.5">CPL</div>
                      <div className="font-semibold text-gray-900 text-lg">{weekData.budget && weekData.leads ? (parseFloat(weekData.budget) / parseFloat(weekData.leads)).toFixed(2) : '0.00'}€</div>
                    </div>
                    <div>
                      <div className="text-gray-500 text-xs mb-0.5">CPL Unico</div>
                      <div className="font-semibold text-gray-900 text-lg">{weekData.budget && weekData.uniqueLeads ? (parseFloat(weekData.budget) / parseFloat(weekData.uniqueLeads)).toFixed(2) : '0.00'}€</div>
                    </div>
                    <div>
                      <div className="text-gray-500 text-xs mb-0.5">Costo/App</div>
                      <div className="font-semibold text-gray-900 text-lg">{weekData.budget && weekData.appointments ? (parseFloat(weekData.budget) / parseFloat(weekData.appointments)).toFixed(2) : '0.00'}€</div>
                    </div>
                    <div>
                      <div className="text-gray-500 text-xs mb-0.5">Tasso Presa App</div>
                      <div className="font-semibold text-gray-900 text-lg">{weekData.leads && weekData.appointments ? ((parseFloat(weekData.appointments) / parseFloat(weekData.leads)) * 100).toFixed(2) : '0.00'}%</div>
                    </div>
                  </div>
                </div>
              </div>
              
              <button
                onClick={addWeekData}
                className="w-full px-6 py-4 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl hover:from-green-700 hover:to-green-800 transition-all flex items-center justify-center gap-2 font-semibold text-lg shadow-lg hover:shadow-xl"
              >
                <PlusCircle size={20} />
                Salva Settimana {currentCampaignData.length + 1}
              </button>
            </div>

            <div className="bg-white rounded-3xl shadow-lg p-8 card-hover">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl shadow-md">
                  <BarChart3 className="text-white" size={22} />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Storico Settimane</h2>
                  <p className="text-sm text-gray-600 font-medium">{selectedCampaign}</p>
                </div>
              </div>
              
              {currentCampaignData.length === 0 ? (
                <div className="text-center py-20 text-gray-400">
                  <BarChart3 size={48} className="mx-auto mb-4 opacity-20" />
                  <p className="text-base font-medium">Nessun dato ancora inserito per questa campagna.</p>
                  <p className="text-sm mt-2">Aggiungi la prima settimana usando il form sopra.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {currentCampaignData.map((week, index) => {
                    const prevWeek = index > 0 ? currentCampaignData[index - 1] : null;
                    
                    const renderMetric = (label, value, prevValue, unit = '', highlight = false, lowerIsBetter = false) => {
                      const delta = calculateDelta(parseFloat(value), parseFloat(prevValue));
                      const isPositive = delta > 0;
                      const isNegative = delta < 0;
                      
                      // Determina se il cambiamento è buono o cattivo
                      // Per costi (CPL, CPC, Costo/App): diminuzione = buono (verde), aumento = cattivo (rosso)
                      // Per metriche positive (Click, Lead, CTR, ecc.): aumento = buono (verde), diminuzione = cattivo (rosso)
                      const isGood = lowerIsBetter ? isNegative : isPositive;
                      const isBad = lowerIsBetter ? isPositive : isNegative;
                      
                      let deltaColor = '#9ca3af'; // gray-400
                      if (isGood) deltaColor = '#16a34a'; // green-600
                      if (isBad) deltaColor = '#dc2626'; // red-600
                      
                      return (
                        <div className={`${highlight ? 'bg-blue-50' : ''} rounded-md p-3`}>
                          <div className="text-xs text-gray-500 mb-1">{label}</div>
                          <div className="flex items-baseline gap-1.5">
                            <span className="text-lg font-medium text-gray-900">{value}{unit}</span>
                            {delta !== null && (
                              <span className="text-xs flex items-center gap-0.5" style={{ color: deltaColor }}>
                                {isPositive ? <TrendingUp size={12} /> : isNegative ? <TrendingDown size={12} /> : null}
                                {isPositive ? '+' : ''}{delta}%
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    };
                    
                    return (
                      <div key={index} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow bg-white">
                        <div className="flex items-center justify-between mb-5 pb-4 border-b border-gray-100">
                          <div className="flex items-center gap-3">
                            <div className="px-3 py-1 bg-blue-500 text-white rounded-md text-sm font-medium">
                              W{week.weekNumber}
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-900">{week.weekReference || 'Settimana ' + week.weekNumber}</div>
                              <div className="text-xs text-gray-500 mt-0.5">{new Date(week.date).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs text-gray-500 mb-0.5">Budget</div>
                            <div className="text-lg font-semibold text-gray-900">{week.budget}€</div>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                          {renderMetric('Click', week.clicks, prevWeek?.clicks, '', false, false)}
                          {renderMetric('CTR', week.ctr, prevWeek?.ctr, '%', false, false)}
                          {renderMetric('CPC', week.cpc, prevWeek?.cpc, '€', false, true)}
                          {renderMetric('Vis. Landing', week.landingViews, prevWeek?.landingViews, '', false, false)}
                          {renderMetric('Lead', week.leads, prevWeek?.leads, '', false, false)}
                          {renderMetric('Lead Unici', week.uniqueLeads, prevWeek?.uniqueLeads, '', false, false)}
                          {renderMetric('CR Landing', week.crLanding, prevWeek?.crLanding, '%', true, false)}
                          {renderMetric('CPL', week.costPerLead, prevWeek?.costPerLead, '€', true, true)}
                          {renderMetric('CPL Unico', week.costPerUniqueLead, prevWeek?.costPerUniqueLead, '€', true, true)}
                          {renderMetric('Appuntamenti', week.appointments, prevWeek?.appointments, '', false, false)}
                          {renderMetric('Tasso Presa App', week.appointmentRate, prevWeek?.appointmentRate, '%', true, false)}
                          {renderMetric('Costo/App', week.costPerAppointment, prevWeek?.costPerAppointment, '€', true, true)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
        </div>
      </div>

      {/* Modale Aggregazione con Portal */}
      {showAggregateModal && createPortal(
        <div 
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowAggregateModal(false);
          }}
          style={{ 
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            zIndex: 999999,
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
            overflow: 'auto'
          }}
        >
          <div 
            style={{ 
              backgroundColor: 'white',
              borderRadius: '1rem',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              width: '100%',
              maxWidth: '42rem',
              maxHeight: '90vh',
              overflow: 'auto'
            }}
          >
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Layers className="text-purple-600" size={24} />
                <h2 className="text-xl font-semibold text-gray-900">Aggrega Dati Campagne</h2>
              </div>
              <button
                onClick={() => setShowAggregateModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-normal text-gray-600 mb-2">
                  Nome Aggregazione
                </label>
                <input
                  type="text"
                  value={aggregateConfig.name}
                  onChange={(e) => setAggregateConfig({...aggregateConfig, name: e.target.value})}
                  placeholder="es. Q4 2024"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-purple-400 focus:border-purple-400 text-gray-700 placeholder-gray-400"
                />
              </div>

              <div>
                <label className="block text-sm font-normal text-gray-600 mb-2">
                  Periodo di Riferimento
                </label>
                <input
                  type="text"
                  value={aggregateConfig.period}
                  onChange={(e) => setAggregateConfig({...aggregateConfig, period: e.target.value})}
                  placeholder="es. Ottobre - Dicembre 2024"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-purple-400 focus:border-purple-400 text-gray-700 placeholder-gray-400"
                />
              </div>

              <div>
                <label className="block text-sm font-normal text-gray-600 mb-3">
                  Seleziona Campagne da Aggregare
                </label>
                <div className="space-y-2 max-h-60 overflow-y-auto border border-gray-200 rounded-xl p-4">
                  {Object.keys(campaigns).filter(name => !name.startsWith('📊')).map(campName => (
                    <label key={campName} className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg cursor-pointer">
                      <input
                        type="checkbox"
                        checked={aggregateConfig.selectedCampaigns.includes(campName)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setAggregateConfig({
                              ...aggregateConfig,
                              selectedCampaigns: [...aggregateConfig.selectedCampaigns, campName]
                            });
                          } else {
                            setAggregateConfig({
                              ...aggregateConfig,
                              selectedCampaigns: aggregateConfig.selectedCampaigns.filter(c => c !== campName)
                            });
                          }
                        }}
                        className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                      />
                      <span className="text-sm text-gray-700">{campName}</span>
                      <span className="text-xs text-gray-400 ml-auto">
                        {campaigns[campName].length} settiman{campaigns[campName].length === 1 ? 'a' : 'e'}
                      </span>
                    </label>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  {aggregateConfig.selectedCampaigns.length} campagn{aggregateConfig.selectedCampaigns.length === 1 ? 'a' : 'e'} selezionat{aggregateConfig.selectedCampaigns.length === 1 ? 'a' : 'e'}
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <p className="text-sm text-blue-800">
                  <strong>Come funziona:</strong><br/>
                  • <strong>SOMMA:</strong> Budget, Click, Lead, Lead Unici, Appuntamenti, Visualizzazioni Landing<br/>
                  • <strong>MEDIA:</strong> CTR, CPC, CPL, CPL Unico, CR Landing, Tasso Presa App<br/>
                  • <strong>CALCOLO:</strong> Costo/App (Budget totale / Appuntamenti totali)<br/>
                  Verrà creata una nuova campagna consultabile come le altre.
                </p>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex gap-3">
              <button
                onClick={() => setShowAggregateModal(false)}
                className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors"
              >
                Annulla
              </button>
              <button
                onClick={aggregateData}
                className="flex-1 px-4 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors flex items-center justify-center gap-2"
              >
                <Layers size={18} />
                Crea Aggregazione
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

export default CampaignAnalytics;
