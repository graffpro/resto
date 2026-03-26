import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { Plus, Minus, ShoppingCart, Receipt, RefreshCw, Tag, Percent } from 'lucide-react';
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
  const [activeDiscounts, setActiveDiscounts] = useState([]);

  useEffect(() => {
    initSession();
    fetchMenu();
    fetchPopularItems();
    fetchActiveDiscounts();
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

  const fetchActiveDiscounts = async () => {
    try {
      const response = await axios.get(`${API}/discounts/active`);
      setActiveDiscounts(response.data);
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
    return cart.reduce((sum, item) => {
      // Check for per-item discount
      const menuItem = menuItems.find(m => m.id === item.id);
      const discount = menuItem?.discount_percentage || 0;
      const price = discount > 0 ? item.price * (1 - discount / 100) : item.price;
      return sum + (price * item.quantity);
    }, 0);
  };

  const getCartSubtotal = () => {
    return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  const getApplicableDiscount = () => {
    const subtotal = getCartTotal();
    // Find best applicable discount
    const applicable = activeDiscounts
      .filter(d => subtotal >= (d.min_order_amount || 0))
      .sort((a, b) => b.value - a.value)[0];
    return applicable;
  };

  const calculateFinalTotal = () => {
    const subtotal = getCartTotal();
    const discount = getApplicableDiscount();
    if (!discount) return { subtotal, discountAmount: 0, total: subtotal, discount: null };
    
    let discountAmount = 0;
    if (discount.discount_type === 'percentage') {
      discountAmount = subtotal * (discount.value / 100);
    } else {
      discountAmount = Math.min(discount.value, subtotal);
    }
    
    return {
      subtotal,
      discountAmount,
      total: subtotal - discountAmount,
      discount
    };
  };

  const placeOrder = async () => {
    if (cart.length === 0) {
      toast.error('Səbətiniz boşdur');
      return;
    }

    try {
      const orderData = {
        session_token: session.session_token,
        items: cart.map(item => {
          const menuItem = menuItems.find(m => m.id === item.id);
          return {
            menu_item_id: item.id,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            discount_percentage: menuItem?.discount_percentage || 0
          };
        }),
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
      <div className="min-h-screen flex justify-center items-center bg-[#F9F9F7]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1A4D2E]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F9F9F7] pb-24">
      <header className="sticky top-0 z-50 bg-white border-b border-[#E6E5DF] shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-[#181C1A] heading-font">
                Stol {table?.table_number}
              </h1>
              <p className="text-sm text-[#5C665F]">{az.welcomeMessage}</p>
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
              {filteredItems.map(item => {
                const hasDiscount = item.discount_percentage > 0;
                const discountedPrice = hasDiscount ? item.price * (1 - item.discount_percentage / 100) : item.price;
                
                return (
                  <Card key={item.id} className="bg-white overflow-hidden relative">
                    {hasDiscount && (
                      <Badge className="absolute top-2 right-2 bg-red-500 text-white z-10">
                        -{item.discount_percentage}%
                      </Badge>
                    )}
                    <div className="flex gap-4 p-4">
                      {item.image_url && (
                        <div className="w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden bg-[#F9F9F7]">
                          <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                        </div>
                      )}
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-[#181C1A] mb-1">{item.name}</h3>
                        <p className="text-xs text-[#5C665F] mb-2 line-clamp-2">{item.description}</p>
                        <div className="flex items-center justify-between">
                          <div>
                            {hasDiscount ? (
                              <>
                                <span className="text-sm line-through text-gray-400 mr-2">{item.price.toFixed(2)}</span>
                                <span className="text-xl font-bold text-red-600">{discountedPrice.toFixed(2)} AZN</span>
                              </>
                            ) : (
                              <span className="text-xl font-bold text-[#181C1A]">{item.price.toFixed(2)} AZN</span>
                            )}
                          </div>
                          <Button 
                            onClick={() => addToCart(item)}
                            className="bg-[#C05C3D] hover:bg-[#A64D31] text-white rounded-full px-4 py-2"
                            size="sm"
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="orders">
            <div className="space-y-6">
              {orders.length === 0 ? (
                <div className="bg-white border border-[#E6E5DF] rounded-xl p-12 text-center">
                  <p className="text-[#5C665F] text-lg">Hələ sifariş yoxdur</p>
                </div>
              ) : (
                <>
                  {orders.map(order => (
                    <Card key={order.id} className="bg-white">
                      <CardHeader>
                        <CardTitle className="flex items-center justify-between text-[#181C1A]">
                          <span>Sifariş #{order.order_number}</span>
                          {getStatusBadge(order.status)}
                        </CardTitle>
                        <p className="text-sm text-[#5C665F]">
                          {new Date(order.ordered_at).toLocaleString('az-AZ')}
                        </p>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {order.items.map((item, idx) => (
                            <div key={idx} className="flex justify-between items-center">
                              <div className="flex items-center gap-2">
                                <span>{item.name} x{item.quantity}</span>
                                {item.discount_percentage > 0 && (
                                  <Badge className="bg-red-100 text-red-700 text-xs">
                                    -{item.discount_percentage}%
                                  </Badge>
                                )}
                              </div>
                              <div className="text-right">
                                {item.discount_percentage > 0 ? (
                                  <>
                                    <span className="text-xs line-through text-gray-400 mr-1">
                                      {(item.price * item.quantity).toFixed(2)}
                                    </span>
                                    <span className="font-semibold text-red-600">
                                      {(item.discounted_price || (item.price * item.quantity * (1 - item.discount_percentage / 100))).toFixed(2)} AZN
                                    </span>
                                  </>
                                ) : (
                                  <span className="font-semibold">{(item.price * item.quantity).toFixed(2)} AZN</span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                        
                        {/* Order discount */}
                        {order.discount_amount > 0 && (
                          <div className="mt-3 pt-3 border-t border-dashed border-[#E6E5DF]">
                            <div className="flex justify-between items-center text-green-700">
                              <div className="flex items-center gap-1">
                                <Tag className="w-4 h-4" />
                                <span>{order.discount_name}</span>
                                <Badge className="bg-green-100 text-green-700 text-xs">
                                  {order.discount_type === 'percentage' ? `${order.discount_value}%` : `${order.discount_value} AZN`}
                                </Badge>
                              </div>
                              <span>-{order.discount_amount?.toFixed(2)} AZN</span>
                            </div>
                          </div>
                        )}
                        
                        <div className="border-t border-[#E6E5DF] mt-4 pt-4">
                          {order.subtotal && order.subtotal !== order.total_amount && (
                            <div className="flex justify-between text-sm text-[#5C665F] mb-2">
                              <span>Ara cəm:</span>
                              <span>{order.subtotal?.toFixed(2)} AZN</span>
                            </div>
                          )}
                          <div className="flex justify-between text-lg font-bold text-[#181C1A]">
                            <span>Cəmi:</span>
                            <span>{order.total_amount?.toFixed(2)} AZN</span>
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
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#E6E5DF] shadow-lg p-4">
          <div className="container mx-auto">
            <div className="space-y-3">
              {cart.map(item => {
                const menuItem = menuItems.find(m => m.id === item.id);
                const hasDiscount = menuItem?.discount_percentage > 0;
                const discountedPrice = hasDiscount ? item.price * (1 - menuItem.discount_percentage / 100) : item.price;
                
                return (
                  <div key={item.id} className="flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-[#181C1A]">{item.name}</span>
                      {hasDiscount && (
                        <Badge className="ml-2 bg-red-100 text-red-700 text-xs">
                          -{menuItem.discount_percentage}%
                        </Badge>
                      )}
                    </div>
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
                      <div className="w-24 text-right">
                        {hasDiscount ? (
                          <>
                            <span className="text-xs line-through text-gray-400 block">
                              {(item.price * item.quantity).toFixed(2)}
                            </span>
                            <span className="font-bold text-red-600">
                              {(discountedPrice * item.quantity).toFixed(2)} AZN
                            </span>
                          </>
                        ) : (
                          <span className="font-bold text-[#181C1A]">
                            {(item.price * item.quantity).toFixed(2)} AZN
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              
              {/* Cart Summary with Discounts */}
              <div className="border-t border-[#E6E5DF] pt-3 space-y-2">
                {/* Show applicable order discount */}
                {(() => {
                  const calculation = calculateFinalTotal();
                  const discount = calculation.discount;
                  
                  return (
                    <>
                      {discount && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-3">
                          <div className="flex items-center gap-2 text-green-700">
                            <Tag className="w-4 h-4" />
                            <span className="font-semibold">{discount.name}</span>
                            <Badge className="bg-green-200 text-green-800">
                              {discount.discount_type === 'percentage' ? `${discount.value}%` : `${discount.value} AZN`}
                            </Badge>
                          </div>
                          {discount.min_order_amount > 0 && (
                            <p className="text-xs text-green-600 mt-1">
                              Min. sifariş: {discount.min_order_amount} AZN ✓
                            </p>
                          )}
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between text-sm text-[#5C665F]">
                        <span>Ara cəm:</span>
                        <span>{calculation.subtotal.toFixed(2)} AZN</span>
                      </div>
                      
                      {calculation.discountAmount > 0 && (
                        <div className="flex items-center justify-between text-green-700">
                          <span>Endirim:</span>
                          <span>-{calculation.discountAmount.toFixed(2)} AZN</span>
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between pt-2 border-t border-[#E6E5DF]">
                        <span className="text-lg font-bold text-[#181C1A]">Cəmi:</span>
                        <span className="text-2xl font-bold text-[#181C1A]">{calculation.total.toFixed(2)} AZN</span>
                      </div>
                    </>
                  );
                })()}
                
                <Button 
                  onClick={placeOrder}
                  className="w-full bg-[#C05C3D] hover:bg-[#A64D31] text-white py-6 text-lg rounded-full mt-3"
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
