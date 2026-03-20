import { useState } from 'react';
import axios from 'axios';
import { Calendar, Clock, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function ReservationsPage() {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    date: '',
    time: '',
    guestCount: 2,
    specialRequests: ''
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.customerName || !formData.customerEmail || !formData.customerPhone || !formData.date || !formData.time) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);

    try {
      const reservationData = {
        customer_name: formData.customerName,
        customer_email: formData.customerEmail,
        customer_phone: formData.customerPhone,
        date: formData.date,
        time: formData.time,
        guest_count: parseInt(formData.guestCount),
        special_requests: formData.specialRequests
      };

      await axios.post(`${API}/reservations`, reservationData);
      
      toast.success('Reservation submitted successfully! We will contact you shortly.');
      setFormData({
        customerName: '',
        customerEmail: '',
        customerPhone: '',
        date: '',
        time: '',
        guestCount: 2,
        specialRequests: ''
      });
    } catch (error) {
      console.error('Error creating reservation:', error);
      toast.error('Failed to create reservation. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="min-h-screen">
      <section 
        className="relative h-[400px] bg-cover bg-center flex items-center justify-center"
        style={{ backgroundImage: 'url(https://images.pexels.com/photos/6418655/pexels-photo-6418655.jpeg)' }}
      >
        <div className="absolute inset-0 bg-black/50"></div>
        <div className="relative z-10 text-center text-white px-4">
          <h1 className="text-5xl md:text-6xl font-bold mb-4 heading-font" data-testid="reservation-page-title">
            Reserve Your Table
          </h1>
          <p className="text-xl md:text-2xl max-w-2xl mx-auto">
            Experience exceptional dining in our warm and inviting atmosphere
          </p>
        </div>
      </section>

      <section className="container mx-auto px-4 py-16">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white border border-[#E2E8E2] rounded-xl p-8 md:p-12">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-[#1A4D2E] mb-4 heading-font">Guest Information</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <Label htmlFor="customerName" className="text-[#1A4D2E]">Full Name *</Label>
                    <Input
                      id="customerName"
                      name="customerName"
                      value={formData.customerName}
                      onChange={handleInputChange}
                      required
                      className="mt-2"
                      data-testid="reservation-name-input"
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
                      data-testid="reservation-email-input"
                    />
                  </div>
                  <div>
                    <Label htmlFor="customerPhone" className="text-[#1A4D2E]">Phone Number *</Label>
                    <Input
                      id="customerPhone"
                      name="customerPhone"
                      type="tel"
                      value={formData.customerPhone}
                      onChange={handleInputChange}
                      required
                      className="mt-2"
                      data-testid="reservation-phone-input"
                    />
                  </div>
                </div>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-[#1A4D2E] mb-4 heading-font">Reservation Details</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="date" className="text-[#1A4D2E] flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Date *
                    </Label>
                    <Input
                      id="date"
                      name="date"
                      type="date"
                      min={today}
                      value={formData.date}
                      onChange={handleInputChange}
                      required
                      className="mt-2"
                      data-testid="reservation-date-input"
                    />
                  </div>
                  <div>
                    <Label htmlFor="time" className="text-[#1A4D2E] flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      Time *
                    </Label>
                    <Input
                      id="time"
                      name="time"
                      type="time"
                      value={formData.time}
                      onChange={handleInputChange}
                      required
                      className="mt-2"
                      data-testid="reservation-time-input"
                    />
                  </div>
                  <div>
                    <Label htmlFor="guestCount" className="text-[#1A4D2E] flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      Guests *
                    </Label>
                    <Input
                      id="guestCount"
                      name="guestCount"
                      type="number"
                      min="1"
                      max="20"
                      value={formData.guestCount}
                      onChange={handleInputChange}
                      required
                      className="mt-2"
                      data-testid="reservation-guests-input"
                    />
                  </div>
                </div>
              </div>

              <div>
                <Label htmlFor="specialRequests" className="text-[#1A4D2E]">Special Requests</Label>
                <Textarea
                  id="specialRequests"
                  name="specialRequests"
                  value={formData.specialRequests}
                  onChange={handleInputChange}
                  className="mt-2"
                  rows={4}
                  placeholder="Any dietary restrictions, seating preferences, or special occasions?"
                  data-testid="reservation-special-requests-input"
                />
              </div>

              <Button 
                type="submit" 
                disabled={loading}
                className="w-full bg-[#4F9D69] hover:bg-[#1A4D2E] text-white py-6 rounded-full transition-all duration-200 active:scale-95 text-lg"
                data-testid="submit-reservation-button"
              >
                {loading ? 'Submitting...' : 'Reserve Table'}
              </Button>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
}