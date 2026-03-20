import { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Minus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCart } from '@/context/CartContext';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function HomePage() {
  const [categories, setCategories] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const { addToCart } = useCart();

  useEffect(() => {
    fetchCategories();
    fetchMenuItems();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await axios.get(`${API}/categories`);
      setCategories(response.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast.error('Failed to load categories');
    }
  };

  const fetchMenuItems = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/menu-items`);
      setMenuItems(response.data);
    } catch (error) {
      console.error('Error fetching menu items:', error);
      toast.error('Failed to load menu items');
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = menuItems.filter(item => {
    const matchesCategory = selectedCategory === 'all' || item.category_id === selectedCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch && item.is_available;
  });

  const handleAddToCart = (item) => {
    addToCart(item);
    toast.success(`${item.name} added to cart!`);
  };

  return (
    <div className="min-h-screen">
      <section 
        className="relative h-[500px] bg-cover bg-center flex items-center justify-center"
        style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1752028935881-0674807b046c)' }}
        data-testid="hero-section"
      >
        <div className="absolute inset-0 bg-black/40"></div>
        <div className="relative z-10 text-center text-white px-4">
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold mb-6 heading-font" data-testid="hero-title">
            Fresh, Organic Dining
          </h1>
          <p className="text-xl md:text-2xl mb-8 max-w-2xl mx-auto">
            Experience the finest ingredients crafted into unforgettable meals
          </p>
          <a href="#menu">
            <Button 
              className="bg-[#4F9D69] hover:bg-[#1A4D2E] text-white px-8 py-6 text-lg rounded-full transition-all duration-200 active:scale-95 shadow-lg"
              data-testid="explore-menu-button"
            >
              Explore Menu
            </Button>
          </a>
        </div>
      </section>

      <section id="menu" className="container mx-auto px-4 py-16">
        <div className="mb-12">
          <h2 className="text-4xl md:text-5xl font-bold text-[#1A4D2E] mb-4 heading-font text-center" data-testid="menu-section-title">
            Our Menu
          </h2>
          <p className="text-center text-[#5C6B61] text-lg max-w-2xl mx-auto">
            Discover our carefully curated selection of dishes made with love and the freshest ingredients
          </p>
        </div>

        <div className="mb-8 max-w-md mx-auto">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#5C6B61] w-5 h-5" />
            <Input
              type="text"
              placeholder="Search dishes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-12 border-[#E2E8E2] focus:border-[#4F9D69] focus:ring-[#4F9D69]"
              data-testid="search-input"
            />
          </div>
        </div>

        <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="mb-12">
          <TabsList className="flex justify-center flex-wrap gap-2 bg-transparent mb-8" data-testid="category-tabs">
            <TabsTrigger 
              value="all" 
              className="px-6 py-3 rounded-full accent-font data-[state=active]:bg-[#1A4D2E] data-[state=active]:text-white"
              data-testid="category-all"
            >
              All
            </TabsTrigger>
            {categories.map(category => (
              <TabsTrigger 
                key={category.id} 
                value={category.id}
                className="px-6 py-3 rounded-full accent-font data-[state=active]:bg-[#1A4D2E] data-[state=active]:text-white"
                data-testid={`category-${category.name.toLowerCase().replace(' ', '-')}`}
              >
                {category.name}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {loading ? (
          <div className="text-center py-20">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#1A4D2E]"></div>
            <p className="mt-4 text-[#5C6B61]">Loading menu...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-[#5C6B61] text-lg" data-testid="no-items-message">No items found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8" data-testid="menu-items-grid">
            {filteredItems.map(item => (
              <div 
                key={item.id}
                className="bg-white border border-[#E2E8E2] rounded-xl overflow-hidden hover:-translate-y-1 transition-all duration-200 shadow-lg"
                data-testid={`menu-item-${item.id}`}
              >
                <div className="h-48 overflow-hidden">
                  <img 
                    src={item.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c'}
                    alt={item.name}
                    className="w-full h-full object-cover"
                    data-testid={`menu-item-image-${item.id}`}
                  />
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-bold text-[#1A4D2E] mb-2 heading-font" data-testid={`menu-item-name-${item.id}`}>
                    {item.name}
                  </h3>
                  <p className="text-[#5C6B61] mb-4 line-clamp-2" data-testid={`menu-item-description-${item.id}`}>
                    {item.description}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold text-[#1A4D2E]" data-testid={`menu-item-price-${item.id}`}>
                      ${item.price.toFixed(2)}
                    </span>
                    <Button 
                      onClick={() => handleAddToCart(item)}
                      className="bg-[#4F9D69] hover:bg-[#1A4D2E] text-white rounded-full px-6 transition-all duration-200 active:scale-95"
                      data-testid={`add-to-cart-${item.id}`}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add to Cart
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}