import { useState, useEffect } from 'react';
import axios from 'axios';
import { RefreshCw, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
  completed: 'bg-blue-100 text-blue-800'
};

export default function ReservationsManagement() {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReservations();
  }, []);

  const fetchReservations = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/reservations`);
      setReservations(response.data);
    } catch (error) {
      console.error('Error fetching reservations:', error);
      toast.error('Failed to load reservations');
    } finally {
      setLoading(false);
    }
  };

  const updateReservationStatus = async (reservationId, newStatus) => {
    try {
      await axios.put(`${API}/reservations/${reservationId}/status?status=${newStatus}`);
      toast.success('Reservation status updated successfully');
      fetchReservations();
    } catch (error) {
      console.error('Error updating reservation status:', error);
      toast.error('Failed to update reservation status');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#1A4D2E]"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-4xl font-bold text-[#1A4D2E] heading-font" data-testid="reservations-management-title">Reservations Management</h1>
        <Button 
          onClick={fetchReservations}
          className="bg-[#4F9D69] hover:bg-[#1A4D2E] text-white rounded-md"
          data-testid="refresh-reservations-button"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {reservations.length === 0 ? (
        <div className="bg-white border border-[#E2E8E2] rounded-xl p-12 text-center">
          <p className="text-[#5C6B61] text-lg">No reservations yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reservations.map(reservation => (
            <div 
              key={reservation.id}
              className="bg-white border border-[#E2E8E2] rounded-xl p-6"
              data-testid={`reservation-item-${reservation.id}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-[#1A4D2E] mb-2" data-testid={`reservation-customer-${reservation.id}`}>
                    {reservation.customer_name}
                  </h3>
                  <div className="space-y-1 text-[#5C6B61]">
                    <p><strong>Email:</strong> {reservation.customer_email}</p>
                    <p><strong>Phone:</strong> {reservation.customer_phone}</p>
                    <p><strong>Date:</strong> {reservation.date}</p>
                    <p><strong>Time:</strong> {reservation.time}</p>
                    <p><strong>Guests:</strong> {reservation.guest_count}</p>
                    {reservation.special_requests && (
                      <p><strong>Special Requests:</strong> {reservation.special_requests}</p>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-2 items-end">
                  <Badge className={statusColors[reservation.status]} data-testid={`reservation-status-badge-${reservation.id}`}>
                    {reservation.status.charAt(0).toUpperCase() + reservation.status.slice(1)}
                  </Badge>
                  <p className="text-sm text-[#5C6B61]">
                    Created: {new Date(reservation.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 mt-4 pt-4 border-t border-[#E2E8E2]">
                <Select value={reservation.status} onValueChange={(value) => updateReservationStatus(reservation.id, value)}>
                  <SelectTrigger className="w-48" data-testid={`reservation-status-select-${reservation.id}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}