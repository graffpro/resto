import { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import az from '@/translations/az';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function VenuesPage() {
  const [venues, setVenues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingVenue, setEditingVenue] = useState(null);
  const [formData, setFormData] = useState({ name: '', description: '' });

  useEffect(() => {
    fetchVenues();
  }, []);

  const fetchVenues = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/venues`);
      setVenues(response.data);
    } catch (error) {
      toast.error('Məkanlar yüklənmədi');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingVenue) {
        await axios.put(`${API}/venues/${editingVenue.id}`, formData);
        toast.success('Məkan yeniləndi');
      } else {
        await axios.post(`${API}/venues`, formData);
        toast.success('Məkan əlavə edildi');
      }
      setDialogOpen(false);
      resetForm();
      fetchVenues();
    } catch (error) {
      toast.error('Xəta baş verdi');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Məkanı silmək istədiyinizə əminsiniz?')) return;
    try {
      await axios.delete(`${API}/venues/${id}`);
      toast.success('Məkan silindi');
      fetchVenues();
    } catch (error) {
      toast.error('Xəta baş verdi');
    }
  };

  const handleEdit = (venue) => {
    setEditingVenue(venue);
    setFormData({ name: venue.name, description: venue.description || '' });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({ name: '', description: '' });
    setEditingVenue(null);
  };

  if (loading) {
    return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1A4D2E]"></div></div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-4xl font-bold text-[#1A4D2E] heading-font">{az.venues}</h1>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="bg-[#4F9D69] hover:bg-[#1A4D2E] text-white rounded-md" data-testid="add-venue-button">
              <Plus className="w-4 h-4 mr-2" />
              {az.addVenue}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-[#1A4D2E] heading-font">
                {editingVenue ? az.editVenue : az.addVenue}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">{az.venueName} *</Label>
                <Input id="name" value={formData.name} onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))} required data-testid="venue-name-input" />
              </div>
              <div>
                <Label htmlFor="description">{az.venueDescription}</Label>
                <Textarea id="description" value={formData.description} onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))} rows={3} data-testid="venue-description-input" />
              </div>
              <Button type="submit" className="w-full bg-[#4F9D69] hover:bg-[#1A4D2E] text-white" data-testid="save-venue-button">
                {az.save}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {venues.length === 0 ? (
        <div className="bg-white border border-[#E2E8E2] rounded-xl p-12 text-center">
          <p className="text-[#5C6B61] text-lg">Hələ məkan yoxdur</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {venues.map(venue => (
            <div key={venue.id} className="bg-white border border-[#E2E8E2] rounded-xl p-6" data-testid={`venue-card-${venue.id}`}>
              <h3 className="text-xl font-bold text-[#1A4D2E] mb-2">{venue.name}</h3>
              {venue.description && <p className="text-[#5C6B61] text-sm mb-4">{venue.description}</p>}
              <div className="flex gap-2 pt-4 border-t border-[#E2E8E2]">
                <Button variant="outline" size="sm" onClick={() => handleEdit(venue)} className="flex-1" data-testid={`edit-venue-${venue.id}`}>
                  <Edit className="w-4 h-4 mr-1" />
                  {az.edit}
                </Button>
                <Button variant="destructive" size="sm" onClick={() => handleDelete(venue.id)} data-testid={`delete-venue-${venue.id}`}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}