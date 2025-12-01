import React, { useState, useEffect } from 'react';
import { PlusCircle, TrendingUp, TrendingDown, Calendar, BarChart3, Download, Sparkles } from 'lucide-react';

const CampaignAnalytics = () => {
  const [campaigns, setCampaigns] = useState({});
  const [selectedCampaign, setSelectedCampaign] = useState('');
  const [newCampaignName, setNewCampaignName] = useState('');
  const [showNewCampaignInput, setShowNewCampaignInput] = useState(false);
  
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

  useEffect(() => {
    const saved = localStorage.getItem('marketingCampaigns');
    if (saved) {
      const parsed = JSON.parse(saved);
      setCampaigns(parsed);
      if (Object.keys(parsed).length > 0) {
        setSelectedCampaign(Object.keys(parsed)[0]);
      }
    }
  }, []);

  useEffect(() => {
    if (Object.keys(campaigns).length > 0) {
      localStorage.setItem('marketingCampaigns', JSON.stringify(campaigns));
    }
  }, [campaigns]);

  const addNewCampaign = () => {
    if (newCampaignName.trim() && !campaigns[newCampaignName]) {
      setCampaigns({
        ...campaigns,
        [newCampaignName]: []
      });
      setSelectedCampaign(newCampaignName);
      setNewCampaignName('');
      setShowNewCampaignInput(false);
    }
  };

  const addWeekData = () => {
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
    
    setCampaigns({
      ...campaigns,
      [selectedCampaign]: [...campaigns[selectedCampaign], newWeek]
    });
    
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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="bg-white rounded-2xl shadow-sm p-8 mb-6">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Campaign Analytics</h1>
              <p className="text-sm text-gray-500 mt-1">Monitora le performance delle tue campagne marketing</p>
            </div>
            <button
              onClick={exportData}
              className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              <Download size={16} />
              Esporta
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-normal text-gray-600 mb-2">
                Seleziona Campagna
              </label>
              <select
                value={selectedCampaign}
                onChange={(e) => setSelectedCampaign(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400 text-gray-700"
              >
                <option value="">Seleziona una campagna</option>
                {Object.keys(campaigns).map(camp => (
                  <option key={camp} value={camp}>{camp}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-normal text-gray-600 mb-2">
                Nuova Campagna
              </label>
              {!showNewCampaignInput ? (
                <button
                  onClick={() => setShowNewCampaignInput(true)}
                  className="w-full px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                >
                  <PlusCircle size={18} />
                  Aggiungi Campagna
                </button>
              ) : (
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={newCampaignName}
                    onChange={(e) => setNewCampaignName(e.target.value)}
                    placeholder="Nome campagna..."
                    className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400 text-gray-700 placeholder-gray-400"
                    onKeyPress={(e) => e.key === 'Enter' && addNewCampaign()}
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

        {selectedCampaign && (
          <>
            <div className="bg-white rounded-2xl shadow-sm p-8 mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
                <Calendar className="text-blue-600" size={20} />
                Aggiungi Dati Settimanali - {selectedCampaign}
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-normal text-gray-600 mb-2">Settimana di Riferimento</label>
                  <input
                    type="text"
                    value={weekData.weekReference}
                    onChange={(e) => setWeekData({...weekData, weekReference: e.target.value})}
                    placeholder="es. 18-24 Novembre"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400 text-gray-700 placeholder-gray-400"
                  />
                </div>

                <div>
                  <label className="block text-sm font-normal text-gray-600 mb-2">Data</label>
                  <input
                    type="date"
                    value={weekData.date}
                    onChange={(e) => setWeekData({...weekData, date: e.target.value})}
                    className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-normal text-gray-600 mb-2">Budget Speso (€)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={weekData.budget}
                    onChange={(e) => setWeekData({...weekData, budget: e.target.value})}
                    placeholder="500"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400 text-gray-700 placeholder-gray-400"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-normal text-gray-600 mb-2">Click</label>
                  <input
                    type="number"
                    value={weekData.clicks}
                    onChange={(e) => setWeekData({...weekData, clicks: e.target.value})}
                    placeholder="250"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400 text-gray-700 placeholder-gray-400"
                  />
                </div>

                <div>
                  <label className="block text-sm font-normal text-gray-600 mb-2">CTR Medio (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={weekData.ctr}
                    onChange={(e) => setWeekData({...weekData, ctr: e.target.value})}
                    placeholder="2.5"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400 text-gray-700 placeholder-gray-400"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-normal text-gray-600 mb-2">Visualizzazioni Landing</label>
                  <input
                    type="number"
                    value={weekData.landingViews}
                    onChange={(e) => setWeekData({...weekData, landingViews: e.target.value})}
                    placeholder="150"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400 text-gray-700 placeholder-gray-400"
                  />
                </div>

                <div>
                  <label className="block text-sm font-normal text-gray-600 mb-2">Lead Generati</label>
                  <input
                    type="number"
                    value={weekData.leads}
                    onChange={(e) => setWeekData({...weekData, leads: e.target.value})}
                    placeholder="25"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400 text-gray-700 placeholder-gray-400"
                  />
                </div>

                <div>
                  <label className="block text-sm font-normal text-gray-600 mb-2">Lead Unici Generati</label>
                  <input
                    type="number"
                    value={weekData.uniqueLeads}
                    onChange={(e) => setWeekData({...weekData, uniqueLeads: e.target.value})}
                    placeholder="20"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400 text-gray-700 placeholder-gray-400"
                  />
                </div>

                <div>
                  <label className="block text-sm font-normal text-gray-600 mb-2">Appuntamenti Presi</label>
                  <input
                    type="number"
                    value={weekData.appointments}
                    onChange={(e) => setWeekData({...weekData, appointments: e.target.value})}
                    placeholder="10"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400 text-gray-700 placeholder-gray-400"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-normal text-gray-600 mb-2">CPC Medio (€)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={weekData.cpc}
                    onChange={(e) => setWeekData({...weekData, cpc: e.target.value})}
                    placeholder="2.00"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400 text-gray-700 placeholder-gray-400"
                  />
                </div>

                <div className="md:col-span-3 mt-4 p-4 bg-blue-50 rounded-md">
                  <p className="text-gray-600 text-xs font-normal mb-3">Metriche Calcolate Automaticamente</p>
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
                className="w-full px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
              >
                <PlusCircle size={18} />
                Salva Settimana {currentCampaignData.length + 1}
              </button>
            </div>

            <div className="bg-white rounded-2xl shadow-sm p-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
                <BarChart3 className="text-blue-600" size={20} />
                Storico Settimane - {selectedCampaign}
              </h2>
              
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
  );
};

export default CampaignAnalytics;
