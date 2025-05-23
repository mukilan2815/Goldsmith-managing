
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';

const Index = () => {
  const navigate = useNavigate();
  
  useEffect(() => {
    // Auto-redirect to dashboard or login
    // In a real app, you would check auth state here
    navigate('/');
  }, [navigate]);
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="text-4xl font-serif font-bold mb-4">Loading GoldCraft...</h1>
      </div>
    </div>
  );
};

export default Index;
