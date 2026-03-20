import { useNavigate } from 'react-router-dom';
import { Plus, Minus, Trash2, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCart } from '@/context/CartContext';
import { toast } from 'sonner';

export default function CartPage() {
  const { cartItems, updateQuantity, removeFromCart, getTotalPrice } = useCart();
  const navigate = useNavigate();

  const handleCheckout = () => {
    if (cartItems.length === 0) {
      toast.error('Your cart is empty');
      return;
    }
    navigate('/checkout');
  };

  if (cartItems.length === 0) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <ShoppingBag className="w-24 h-24 mx-auto text-[#5C6B61] mb-6" />
        <h2 className="text-3xl font-bold text-[#1A4D2E] mb-4 heading-font" data-testid="empty-cart-title">Your Cart is Empty</h2>
        <p className="text-[#5C6B61] mb-8">Add some delicious items to get started!</p>
        <Button 
          onClick={() => navigate('/')}
          className="bg-[#4F9D69] hover:bg-[#1A4D2E] text-white px-8 py-6 rounded-full transition-all duration-200 active:scale-95"
          data-testid="browse-menu-button"
        >
          Browse Menu
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-4xl md:text-5xl font-bold text-[#1A4D2E] mb-8 heading-font" data-testid="cart-page-title">Your Cart</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          {cartItems.map(item => (
            <div 
              key={item.id}
              className="bg-white border border-[#E2E8E2] rounded-xl p-6 flex gap-6"
              data-testid={`cart-item-${item.id}`}
            >
              <img 
                src={item.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c'}
                alt={item.name}
                className="w-24 h-24 rounded-lg object-cover"
                data-testid={`cart-item-image-${item.id}`}
              />
              <div className="flex-1">
                <h3 className="text-xl font-bold text-[#1A4D2E] mb-2" data-testid={`cart-item-name-${item.id}`}>{item.name}</h3>
                <p className="text-[#5C6B61] mb-4">${item.price.toFixed(2)}</p>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      className="w-8 h-8 rounded-full p-0"
                      data-testid={`decrease-quantity-${item.id}`}
                    >
                      <Minus className="w-4 h-4" />
                    </Button>
                    <span className="w-12 text-center font-semibold" data-testid={`cart-item-quantity-${item.id}`}>{item.quantity}</span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      className="w-8 h-8 rounded-full p-0"
                      data-testid={`increase-quantity-${item.id}`}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => {
                      removeFromCart(item.id);
                      toast.success('Item removed from cart');
                    }}
                    className="ml-auto rounded-full"
                    data-testid={`remove-item-${item.id}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold text-[#1A4D2E]" data-testid={`cart-item-total-${item.id}`}>
                  ${(item.price * item.quantity).toFixed(2)}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="lg:col-span-1">
          <div className="bg-white border border-[#E2E8E2] rounded-xl p-6 sticky top-24">
            <h3 className="text-2xl font-bold text-[#1A4D2E] mb-6 heading-font" data-testid="order-summary-title">Order Summary</h3>
            <div className="space-y-4 mb-6">
              <div className="flex justify-between text-[#5C6B61]">
                <span>Subtotal</span>
                <span data-testid="cart-subtotal">${getTotalPrice().toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[#5C6B61]">
                <span>Tax (10%)</span>
                <span data-testid="cart-tax">${(getTotalPrice() * 0.1).toFixed(2)}</span>
              </div>
              <div className="border-t border-[#E2E8E2] pt-4">
                <div className="flex justify-between text-xl font-bold text-[#1A4D2E]">
                  <span>Total</span>
                  <span data-testid="cart-total">${(getTotalPrice() * 1.1).toFixed(2)}</span>
                </div>
              </div>
            </div>
            <Button 
              onClick={handleCheckout}
              className="w-full bg-[#4F9D69] hover:bg-[#1A4D2E] text-white py-6 rounded-full transition-all duration-200 active:scale-95 text-lg"
              data-testid="proceed-to-checkout-button"
            >
              Proceed to Checkout
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}