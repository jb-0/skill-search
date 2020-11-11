import React, { useContext } from 'react';
import './Landing.css';
import Image from '../components/common/Image';
import { ViewContext } from '../context/ViewContext';
import {
  FacebookLoginButton,
  GoogleLoginButton,
} from 'react-social-login-buttons';

function Landing() {
  const size = useContext(ViewContext);

  return (
    <div
      className={`top-landing-container top-landing-container-${size.device.toLowerCase()}`}
    >
      <h1>Track in demand skills in your area</h1>
      <div className="top-landing-container-grid">
        <h2 className="top-landing-container-text">
          While there are plenty of great job sites out there it can be
          challenging to get a true gauge of how in demand a set of skills are,
          especially when you want to track this over time or observe historic
          trends. Skills Search provides an easy to use solution to this
          problem.
        </h2>
        <div className="top-landing-container-first-image">
          <Image
            src="/images/guy-in-breakout-area.jpeg"
            alt="Man sitting in breakout area with laptop"
          />
        </div>
      </div>
      <div className="social-login-buttons">
        <a href="/auth/facebook">
          <FacebookLoginButton>Sign up with Facebook</FacebookLoginButton>
        </a>
        <a href="/auth/google">
          <GoogleLoginButton>Sign up with Google</GoogleLoginButton>
        </a>
      </div>
    </div>
  );
}

export default Landing;