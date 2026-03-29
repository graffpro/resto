import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Calendar, Clock, MapPin, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { useCart } from '@/context/CartContext';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';
const API = `${BACKEND_URL}/api`;

export default function CheckoutPage() {
  const { cartItems, getTotalPrice, clearCart } = useCart();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    orderType: 'delivery',
    deliveryAddress: '',
    deliveryTime: '',
    pickupTime: '',
    specialInstructions: ''
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.customerName || !formData.customerEmail || !formData.customerPhone) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (formData.orderType === 'delivery' && !formData.deliveryAddress) {
      toast.error('Please enter delivery address');
      return;
    }

    setLoading(true);

    try {
      const orderData = {
        customer_name: formData.customerName,
        customer_email: formData.customerEmail,
        customer_phone: formData.customerPhone,
        order_type: formData.orderType,
        items: cartItems.map(item => ({
          menu_item_id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity
        })),
        total_amount: getTotalPrice() * 1.1,
        delivery_address: formData.orderType === 'delivery' ? formData.deliveryAddress : null,
        delivery_time: formData.orderType === 'delivery' ? formData.deliveryTime : null,
        pickup_time: formData.orderType === 'pickup' ? formData.pickupTime : null,
        special_instructions: formData.specialInstructions
      };

      const response = await axios.post(`${API}/orders`, orderData);
      
      toast.success(`Order placed successfully! Order #${response.data.order_number}`);
      clearCart();
      navigate('/my-orders');
    } catch (error) {
      console.error('Error placing order:', error);
      toast.error('Failed to place order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (cartItems.length === 0) {
    navigate('/cart');
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-4xl md:text-5xl font-bold text-[#1A4D2E] mb-8 heading-font" data-testid="checkout-page-title">Checkout</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="bg-white border border-[#E2E8E2] rounded-xl p-8 space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-[#1A4D2E] mb-4 heading-font">Contact Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="customerName" className="text-[#1A4D2E]">Full Name *</Label>
                  <Input
                    id="customerName"
                    name="customerName"
                    value={formData.customerName}
                    onChange={handleInputChange}
                    required
                    className="mt-2"
                    data-testid="customer-name-input"
                  />
                </div>
                <div>
                  <Label htmlFor="customerEmail" className="text-[#1A4D2E]">Email *</Label>
                  <Input
                    id="customerEmail"
                    name="customerEmail"
                    type="email"
                    value={formData.customerEmail}
                    onChange={handleInputChange}
                    required
                    className="mt-2"
                    data-testid="customer-email-input"
                  />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="customerPhone" className="text-[#1A4D2E]">Phone Number *</Label>
                  <Input
                    id="customerPhone"
                    name="customerPhone"
                    type="tel"
                    value={formData.customerPhone}
                    onChange={handleInputChange}
                    required
                    className="mt-2"
                    data-testid="customer-phone-input"
                  />
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-[#1A4D2E] mb-4 heading-font">Order Type</h2>
              <RadioGroup value={formData.orderType} onValueChange={(value) => setFormData(prev => ({ ...prev, orderType: value }))}>
                <div className="flex items-center space-x-2 p-4 border border-[#E2E8E2] rounded-lg hover:bg-[#F5F9E9] transition-colors" data-testid="order-type-delivery">
                  <RadioGroupItem value="delivery" id="delivery" />
                  <Label htmlFor="delivery" className="flex items-center gap-2 cursor-pointer flex-1">
                    <Truck className="w-5 h-5 text-[#4F9D69]" />
                    <span className="text-[#1A4D2E] font-semibold">Delivery</span>
                  </Label>
                </div>
                <div className="flex items-center space-x-2 p-4 border border-[#E2E8E2] rounded-lg hover:bg-[#F5F9E9] transition-colors" data-testid="order-type-pickup">
                  <RadioGroupItem value="pickup" id="pickup" />
                  <Label htmlFor="pickup" className="flex items-center gap-2 cursor-pointer flex-1">
                    <MapPin className="w-5 h-5 text-[#4F9D69]" />
                    <span className="text-[#1A4D2E] font-semibold">Pickup</span>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {formData.orderType === 'delivery' && (
              <div>
                <h2 className="text-2xl font-bold text-[#1A4D2E] mb-4 heading-font">Delivery Details</h2>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="deliveryAddress" className="text-[#1A4D2E]">Delivery Address *</Label>
                    <Textarea
                      id="deliveryAddress"
                      name="deliveryAddress"
                      value={formData.deliveryAddress}
                      onChange={handleInputChange}
                      className="mt-2"
                      rows={3}
                      data-testid="delivery-address-input"
                    />
                  </div>
                  <div>
                    <Label htmlFor="deliveryTime" className="text-[#1A4D2E]">Preferred Delivery Time</Label>
                    <Input
                      id="deliveryTime"
                      name="deliveryTime"
                      type="time"
                      value={formData.deliveryTime}
                      onChange={handleInputChange}
                      className="mt-2"
                      data-testid="delivery-time-input"
                    />
                  </div>
                </div>
              </div>
            )}

            {formData.orderType === 'pickup' && (
              <div>
                <h2 className="text-2xl font-bold text-[#1A4D2E] mb-4 heading-font">Pickup Details</h2>
                <div>
                  <Label htmlFor="pickupTime" className="text-[#1A4D2E]">Preferred Pickup Time</Label>
                  <Input
                    id="pickupTime"
                    name="pickupTime"
                    type="time"
                    value={formData.pickupTime}
                    onChange={handleInputChange}
                    className="mt-2"
                    data-testid="pickup-time-input"
                  />
                </div>
              </div>
            )}

            <div>
              <Label htmlFor="specialInstructions" className="text-[#1A4D2E]">Special Instructions</Label>
              <Textarea
                id="specialInstructions"
                name="specialInstructions"
                value={formData.specialInstructions}
                onChange={handleInputChange}
                className="mt-2"
                rows={3}
                placeholder="Any dietary restrictions or special requests?"
                data-testid="special-instructions-input"
              />
            </div>

            <Button 
              type="submit" 
              disabled={loading}
              className="w-full bg-[#4F9D69] hover:bg-[#1A4D2E] text-white py-6 rounded-full transition-all duration-200 active:scale-95 text-lg"
              data-testid="place-order-button"
            >
              {loading ? 'Placing Order...' : 'Place Order (Cash on Delivery)'}
            </Button>
          </form>
        </div>

        <div className="lg:col-span-1">
          <div className="bg-white border border-[#E2E8E2] rounded-xl p-6 sticky top-24">
            <h3 className="text-2xl font-bold text-[#1A4D2E] mb-6 heading-font">Order Summary</h3>
            <div className="space-y-3 mb-6">
              {cartItems.map(item => (
                <div key={item.id} className="flex justify-between text-[#5C6B61]">
                  <span>{item.name} x {item.quantity}</span>
                  <span>${(item.price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>
            <div className="space-y-4 mb-6 border-t border-[#E2E8E2] pt-4">
              <div className="flex justify-between text-[#5C6B61]">
                <span>Subtotal</span>
                <span>${getTotalPrice().toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[#5C6B61]">
                <span>Tax (10%)</span>
                <span>${(getTotalPrice() * 0.1).toFixed(2)}</span>
              </div>
              <div className="border-t border-[#E2E8E2] pt-4">
                <div className="flex justify-between text-xl font-bold text-[#1A4D2E]">
                  <span>Total</span>
                  <span data-testid="checkout-total">${(getTotalPrice() * 1.1).toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}