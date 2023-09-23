import logo from './logo.svg';
import './App.css';
import {Link} from 'react-router-dom';



function App() {

 
  return (

        <>
        <div className='nav'>
          <div className="nav-left">
          <a href='#' className='nav-item'>P GPT</a>
          <a href='#' className='nav-item'>Solution</a>
          <a href='#' className='nav-item'>Resources</a>
          <a href='#' className='nav-item'>Pricing</a>
          <a href='#' className='nav-item'>About</a>
          
          </div>
          <div className="nav-right">
          <a href='#' className='nav-item'>Request Demo</a>
          <a href='#' className='nav-item'>Login</a>
          <a href='#' className='nav-item btn'>sign in</a>


          </div>


         
        </div>
        <img src='calender.webp' />
        
        </>
    
    
  );
}

export default App;
