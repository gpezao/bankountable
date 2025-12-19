// Datos dummy realistas para Fase 1
// Representan 3 meses de transacciones con patrones de malos hábitos financieros

const categories = [
  'Alimentación',
  'Transporte',
  'Entretenimiento',
  'Compras',
  'Servicios',
  'Salud',
  'Educación',
  'Otros'
];

const paymentMethods = ['Crédito', 'Débito'];

// Comercios recurrentes (patrón de mal hábito)
const recurringMerchants = [
  'Starbucks',
  'Rappi',
  'Uber Eats',
  'Pedidos Ya',
  'McDonald\'s',
  'Subway',
  'Farmacia Ahumada',
  'Shell',
  'Copec'
];

// Generar transacciones para los últimos 3 meses
function generateTransactions() {
  const transactions = [];
  const today = new Date();
  
  // Generar para últimos 3 meses
  for (let monthOffset = 2; monthOffset >= 0; monthOffset--) {
    const monthDate = new Date(today.getFullYear(), today.getMonth() - monthOffset, 1);
    const daysInMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate();
    
    // Gastos pequeños recurrentes (cafés, delivery) - casi diarios
    for (let day = 1; day <= daysInMonth; day++) {
      // Café pequeño (60% probabilidad)
      if (Math.random() < 0.6) {
        transactions.push({
          id: `t-${monthOffset}-${day}-1`,
          date: new Date(monthDate.getFullYear(), monthDate.getMonth(), day, 8, 30),
          description: 'Starbucks',
          amount: Math.floor(Math.random() * 3000) + 2000, // $2.000 - $5.000
          category: 'Alimentación',
          tags: ['café', 'recurrente'],
          paymentMethod: 'Crédito',
          merchant: 'Starbucks'
        });
      }
      
      // Delivery (40% probabilidad)
      if (Math.random() < 0.4) {
        const deliveryServices = ['Rappi', 'Uber Eats', 'Pedidos Ya'];
        const service = deliveryServices[Math.floor(Math.random() * deliveryServices.length)];
        transactions.push({
          id: `t-${monthOffset}-${day}-2`,
          date: new Date(monthDate.getFullYear(), monthDate.getMonth(), day, 20, 0),
          description: `${service} - Comida rápida`,
          amount: Math.floor(Math.random() * 15000) + 8000, // $8.000 - $23.000
          category: 'Alimentación',
          tags: ['delivery', 'recurrente'],
          paymentMethod: 'Crédito',
          merchant: service
        });
      }
    }
    
    // Gastos grandes aislados (1-3 por mes)
    const bigPurchases = Math.floor(Math.random() * 3) + 1;
    for (let i = 0; i < bigPurchases; i++) {
      const bigCategories = ['Compras', 'Entretenimiento', 'Servicios'];
      const category = bigCategories[Math.floor(Math.random() * bigCategories.length)];
      const day = Math.floor(Math.random() * daysInMonth) + 1;
      
      transactions.push({
        id: `t-${monthOffset}-big-${i}`,
        date: new Date(monthDate.getFullYear(), monthDate.getMonth(), day, 14, 0),
        description: category === 'Compras' ? 'Compra online - Varios productos' :
                     category === 'Entretenimiento' ? 'Concierto / Evento' :
                     'Pago de servicios varios',
        amount: Math.floor(Math.random() * 200000) + 50000, // $50.000 - $250.000
        category: category,
        tags: ['grande', 'aislado'],
        paymentMethod: 'Crédito',
        merchant: category === 'Compras' ? 'Amazon' : category === 'Entretenimiento' ? 'Ticketek' : 'Servipag'
      });
    }
    
    // Gastos de transporte (frecuentes)
    for (let day = 1; day <= daysInMonth; day++) {
      if (Math.random() < 0.7) { // 70% de los días
        const transportTypes = [
          { desc: 'Uber', amount: Math.floor(Math.random() * 5000) + 3000 },
          { desc: 'Metro', amount: 800 },
          { desc: 'Combustible Shell', amount: Math.floor(Math.random() * 20000) + 15000 },
          { desc: 'Combustible Copec', amount: Math.floor(Math.random() * 20000) + 15000 }
        ];
        const transport = transportTypes[Math.floor(Math.random() * transportTypes.length)];
        
        transactions.push({
          id: `t-${monthOffset}-${day}-trans`,
          date: new Date(monthDate.getFullYear(), monthDate.getMonth(), day, 9, 0),
          description: transport.desc,
          amount: transport.amount,
          category: 'Transporte',
          tags: ['transporte', 'recurrente'],
          paymentMethod: Math.random() < 0.8 ? 'Crédito' : 'Débito', // 80% crédito
          merchant: transport.desc.includes('Shell') ? 'Shell' : 
                   transport.desc.includes('Copec') ? 'Copec' : 'Uber'
        });
      }
    }
    
    // Gastos de farmacia (ocasionales pero recurrentes)
    for (let day = 1; day <= daysInMonth; day++) {
      if (Math.random() < 0.15) { // 15% de los días
        transactions.push({
          id: `t-${monthOffset}-${day}-pharm`,
          date: new Date(monthDate.getFullYear(), monthDate.getMonth(), day, 12, 0),
          description: 'Farmacia Ahumada',
          amount: Math.floor(Math.random() * 25000) + 5000, // $5.000 - $30.000
          category: 'Salud',
          tags: ['farmacia'],
          paymentMethod: 'Crédito',
          merchant: 'Farmacia Ahumada'
        });
      }
    }
    
    // Gastos de supermercado (2-3 veces por mes)
    const supermarketTrips = Math.floor(Math.random() * 2) + 2;
    for (let i = 0; i < supermarketTrips; i++) {
      const day = Math.floor(Math.random() * daysInMonth) + 1;
      transactions.push({
        id: `t-${monthOffset}-${day}-super`,
        date: new Date(monthDate.getFullYear(), monthDate.getMonth(), day, 18, 0),
        description: 'Supermercado Lider',
        amount: Math.floor(Math.random() * 50000) + 30000, // $30.000 - $80.000
        category: 'Alimentación',
        tags: ['supermercado'],
        paymentMethod: 'Crédito',
        merchant: 'Lider'
      });
    }
  }
  
  // Ordenar por fecha (más reciente primero)
  return transactions.sort((a, b) => b.date - a.date);
}

export const dummyTransactions = generateTransactions();

// Calcular estadísticas
export function getStats(transactions = dummyTransactions) {
  const total = transactions.reduce((sum, t) => sum + t.amount, 0);
  const byCategory = {};
  const byMerchant = {};
  const byPaymentMethod = { Crédito: 0, Débito: 0 };
  
  transactions.forEach(t => {
    byCategory[t.category] = (byCategory[t.category] || 0) + t.amount;
    byMerchant[t.merchant] = (byMerchant[t.merchant] || 0) + t.amount;
    byPaymentMethod[t.paymentMethod] = (byPaymentMethod[t.paymentMethod] || 0) + t.amount;
  });
  
  const topCategories = Object.entries(byCategory)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, amount]) => ({ name, amount }));
  
  const topMerchants = Object.entries(byMerchant)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, amount]) => ({ name, amount }));
  
  return {
    total,
    byCategory,
    byMerchant,
    byPaymentMethod,
    topCategories,
    topMerchants,
    totalTransactions: transactions.length,
    creditUsage: (byPaymentMethod.Crédito / total * 100).toFixed(1)
  };
}

export { categories, paymentMethods };


