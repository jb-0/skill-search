import React, { useContext } from 'react';
import './Search.css'
import Image from '../components/common/Image';
import Search from '../components/search/Search'
import { ViewContext } from '../context/ViewContext';

function HomePage() {
  const size = useContext(ViewContext);
  return (
    <div className={
      size.device === 'Desktop'
        ? 'home-top-container'
        : 'home-top-container-mobile home-top-container'
    }>
      <Image src="/images/home-hero.png" alt="Laptop and plant hero" />
      <div className="overlay-image-container">
        <h1>Search for your skillset</h1>
        <Search />
      </div>
      
    </div>
  );
}

export default HomePage;