import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { Plus, Minus, ShoppingCart, Receipt, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import az from '@/translations/az';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function CustomerPage() {
  const { tableId } = useParams();
  const [session, setSession] = useState(null);
  const [table, setTable] = useState(null);
  const [categories, setCategories] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [cart, setCart] = useState([]);
  const [orders, setOrders] = useState([]);
  const [totalBill, setTotalBill] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [popularItems, setPopularItems] = useState([]);

  useEffect(() => {
    initSession();
    fetchMenu();
    fetchPopularItems();
  }, [tableId]);

  useEffect(() => {
    if (session) {
      fetchOrders();
      const interval = setInterval(fetchOrders, 5000);
      return () => clearInterval(interval);
    }
  }, [session]);

  const initSession = async () => {
    try {
      const response = await axios.post(`${API}/sessions/start/${tableId}`);
      setSession(response.data.session);
      setTable(response.data.table);
    } catch (error) {
      toast.error('Xəta baş verdi');
    } finally {
      setLoading(false);
    }
  };

  const fetchMenu = async () => {
    try {
      const [catsRes, itemsRes] = await Promise.all([
        axios.get(`${API}/categories`),
        axios.get(`${API}/menu-items`)
      ]);
      setCategories(catsRes.data);
      setMenuItems(itemsRes.data.filter(item => item.is_available));
    } catch (error) {
      console.error(error);
    }
  };

  const fetchPopularItems = async () => {
    try {
      const response = await axios.get(`${API}/analytics/popular-items`);
      const popularIds = response.data.slice(0, 5).map(item => item.id);
      setPopularItems(popularIds);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchOrders = async () => {
    if (!session) return;
    try {
      const response = await axios.get(`${API}/orders/session/${session.session_token}`);
      setOrders(response.data.orders);
      setTotalBill(response.data.total_bill);
    } catch (error) {
      console.error(error);
    }
  };

  const addToCart = (item) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) {
        return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const updateCartQuantity = (itemId, delta) => {
    setCart(prev => {
      const item = prev.find(i => i.id === itemId);
      if (!item) return prev;
      const newQty = item.quantity + delta;
      if (newQty <= 0) return prev.filter(i => i.id !== itemId);
      return prev.map(i => i.id === itemId ? { ...i, quantity: newQty } : i);
    });
  };

  const getCartTotal = () => {
    return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  const placeOrder = async () => {
    if (cart.length === 0) {
      toast.error('Səbətiniz boşdur');
      return;
    }

    try {
      const orderData = {
        session_token: session.session_token,
        items: cart.map(item => ({
          menu_item_id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity
        })),
        total_amount: getCartTotal()
      };

      await axios.post(`${API}/orders`, orderData);
      toast.success('Sifariş qəbul edildi!');
      setCart([]);
      fetchOrders();
    } catch (error) {
      toast.error('Xəta baş verdi');
    }
  };

  const filteredItems = menuItems.filter(item => {
    const matchesCategory = selectedCategory === 'all' || item.category_id === selectedCategory;
    const matchesSearch = searchQuery === '' || 
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const getStatusBadge = (status) => {
    const config = {
      pending: { class: 'bg-yellow-100 text-yellow-800', text: az.pending },
      preparing: { class: 'bg-orange-100 text-orange-800', text: az.preparing },
      ready: { class: 'bg-green-100 text-green-800', text: az.ready },
      delivered: { class: 'bg-blue-100 text-blue-800', text: az.delivered }
    };
    const c = config[status] || config.pending;
    return <Badge className={c.class}>{c.text}</Badge>;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex justify-center items-center bg-[#F5F9E9]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1A4D2E]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F9E9] pb-24">
      <header className="sticky top-0 z-50 bg-white border-b border-[#E2E8E2] shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-[#1A4D2E] heading-font">
                Stol {table?.table_number}
              </h1>
              <p className="text-sm text-[#5C6B61]">{az.welcomeMessage}</p>
            </div>
            {cart.length > 0 && (
              <div className="flex items-center gap-2 px-4 py-2 bg-[#1A4D2E] text-white rounded-full">
                <ShoppingCart className="w-5 h-5" />
                <span className="font-bold">{cart.reduce((sum, i) => sum + i.quantity, 0)}</span>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <Tabs defaultValue="menu" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="menu" data-testid="menu-tab">{az.menu}</TabsTrigger>
            <TabsTrigger value="orders" data-testid="orders-tab">{az.yourOrder}</TabsTrigger>
          </TabsList>

          <TabsContent value="menu">
            <div className="mb-6">
              <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
                <TabsList className="flex flex-wrap justify-start gap-2 bg-transparent mb-6">
                  <TabsTrigger 
                    value="all" 
                    className="px-4 py-2 rounded-full accent-font data-[state=active]:bg-[#1A4D2E] data-[state=active]:text-white"
                  >
                    Hamısı
                  </TabsTrigger>
                  {categories.map(cat => (
                    <TabsTrigger 
                      key={cat.id} 
                      value={cat.id}
                      className="px-4 py-2 rounded-full accent-font data-[state=active]:bg-[#1A4D2E] data-[state=active]:text-white"
                    >
                      {cat.name}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredItems.map(item => (
                <Card key={item.id} className="bg-white overflow-hidden">
                  <div className="flex gap-4 p-4">
                    {item.image_url && (
                      <div className="w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden bg-[#F5F9E9]">
                        <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-[#1A4D2E] mb-1">{item.name}</h3>
                      <p className="text-xs text-[#5C6B61] mb-2 line-clamp-2">{item.description}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-xl font-bold text-[#1A4D2E]">{item.price} AZN</span>
                        <Button 
                          onClick={() => addToCart(item)}
                          className="bg-[#4F9D69] hover:bg-[#1A4D2E] text-white rounded-full px-4 py-2"
                          size="sm"
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="orders">
            <div className="space-y-6">
              {orders.length === 0 ? (
                <div className="bg-white border border-[#E2E8E2] rounded-xl p-12 text-center">
                  <p className="text-[#5C6B61] text-lg">Hələ sifariş yoxdur</p>
                </div>
              ) : (
                <>
                  {orders.map(order => (
                    <Card key={order.id} className="bg-white">
                      <CardHeader>
                        <CardTitle className="flex items-center justify-between text-[#1A4D2E]">
                          <span>Sifariş #{order.order_number}</span>
                          {getStatusBadge(order.status)}
                        </CardTitle>
                        <p className="text-sm text-[#5C6B61]">
                          {new Date(order.ordered_at).toLocaleString('az-AZ')}
                        </p>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {order.items.map((item, idx) => (
                            <div key={idx} className="flex justify-between">
                              <span>{item.name} x{item.quantity}</span>
                              <span className="font-semibold">{(item.price * item.quantity).toFixed(2)} AZN</span>
                            </div>
                          ))}
                        </div>
                        <div className="border-t border-[#E2E8E2] mt-4 pt-4">
                          <div className="flex justify-between text-lg font-bold text-[#1A4D2E]">
                            <span>Cəmi:</span>
                            <span>{order.total_amount.toFixed(2)} AZN</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                  <Card className="bg-[#1A4D2E] text-white">
                    <CardContent className="p-6">
                      <div className="flex justify-between items-center">
                        <span className="text-2xl font-bold heading-font">Ümumi hesab:</span>
                        <span className="text-3xl font-bold">{totalBill.toFixed(2)} AZN</span>
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#E2E8E2] shadow-lg p-4">
          <div className="container mx-auto">
            <div className="space-y-3">
              {cart.map(item => (
                <div key={item.id} className="flex items-center justify-between">
                  <span className="font-semibold text-[#1A4D2E]">{item.name}</span>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => updateCartQuantity(item.id, -1)}
                        className="w-8 h-8 p-0 rounded-full"
                      >
                        <Minus className="w-4 h-4" />
                      </Button>
                      <span className="w-8 text-center font-bold">{item.quantity}</span>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => updateCartQuantity(item.id, 1)}
                        className="w-8 h-8 p-0 rounded-full"
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                    <span className="font-bold text-[#1A4D2E] w-20 text-right">
                      {(item.price * item.quantity).toFixed(2)} AZN
                    </span>
                  </div>
                </div>
              ))}
              <div className="border-t border-[#E2E8E2] pt-3">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-lg font-bold text-[#1A4D2E]">Cəmi:</span>
                  <span className="text-2xl font-bold text-[#1A4D2E]">{getCartTotal().toFixed(2)} AZN</span>
                </div>
                <Button 
                  onClick={placeOrder}
                  className="w-full bg-[#4F9D69] hover:bg-[#1A4D2E] text-white py-6 text-lg rounded-full"
                  data-testid="place-order-button"
                >
                  <Receipt className="w-5 h-5 mr-2" />
                  Sifariş ver
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
