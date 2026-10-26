import { useState } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';

function Home({ username }) {
  const [selectedDate, setSelectedDate] = useState(new Date());

  return (
    <div className="calendar-wrapper" style={{ padding: '20px', maxWidth: '450px' }}>
      <h2>Welcome, {username}!</h2>
      <h3>Interactive Schedule</h3>
      
      <Calendar 
        onChange={setSelectedDate} 
        value={selectedDate}
      />
    </div>
  );
}

export default Home;
