import { Component, signal } from '@angular/core';
import { Login } from '../../services/login/login';
import { Register } from '../../services/register/register';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth/auth-service';
import { ThemeToggle } from '../../components/theme-toggle/theme-toggle';


@Component({
  selector: 'app-login-page',
  imports: [CommonModule, ThemeToggle],
  templateUrl: './login-page.html',
  styleUrl: './login-page.css',
})
export class LoginPage {
  isSignup = signal(false);
  
  // Login fields
  userName = signal('');
  password = signal('');
  
  // Signup fields
  name = signal('');
  email = signal('');
  signupUsername = signal('');
  signupPassword = signal('');

  constructor(
    private loginFunction: Login,
    private registerFunction: Register,
    private router: Router,
    private authService:AuthService
  ) {}

  setEmail(event: Event) {
    const target = event.target as HTMLInputElement;
    this.userName.set(target.value)
  }

  setPassword(event: Event) {
    const target = event.target as HTMLInputElement;
    this.password.set(target.value)
  }

  setName(event: Event) {
    const target = event.target as HTMLInputElement;
    this.name.set(target.value)
  }

  setSignupEmail(event: Event) {
    const target = event.target as HTMLInputElement;
    this.email.set(target.value)
  }

  setSignupUsername(event: Event) {
    const target = event.target as HTMLInputElement;
    this.signupUsername.set(target.value)
  }

  setSignupPassword(event: Event) {
    const target = event.target as HTMLInputElement;
    this.signupPassword.set(target.value)
  }

  userLogin() {
    const identifier = this.userName().trim();
    const password = this.password().trim();

    if (!identifier || !password) {
      alert('Please enter username/email and password');
      return;
    }

    const user = {
      ...(identifier.includes('@')
        ? { email: identifier.toLowerCase() }
        : { username: identifier.toLowerCase() }),
      password,
    };
    this.loginFunction.checkLogin(user).subscribe({
      next: (data) => {
        if (data.token) {
          localStorage.setItem("token", data.token)
        }
        this.router.navigate(['/dashbord'])
      },
      error: (error) => {
        console.error('Login error:', error);
        alert('Login failed. Please check your credentials.');
      }
    })
  }

  async loginWithGoogle() {
    try {
      await this.authService.promptGoogleSignIn();
    } catch (error) {
      console.error('Google Sign-In failed to start:', error);
      alert('Google Sign-In is not available in this browser right now.');
    }
  }
  
  userSignup() {
    // Validation
    if (!this.name() || !this.signupUsername() || !this.email() || !this.signupPassword()) {
      alert('Please fill in all fields');
      return;
    }

    if (this.signupPassword().length < 6) {
      alert('Password must be at least 6 characters');
      return;
    }

    const user = {
      name: this.name(),
      username: this.signupUsername(),
      email: this.email(),
      password: this.signupPassword()
    }

    this.registerFunction.registerUser(user).subscribe({
      next: (data) => {
        if (data.token) {
          localStorage.setItem("token", data.token)
        }
        this.router.navigate(['/dashbord'])
      },
      error: (error) => {
        console.error('Signup error:', error);
        alert('Signup failed. Username or email may already exist.');
      }
    })
  }

  toggleForm() {
    this.isSignup.set(!this.isSignup());
    // Clear fields when switching
    this.userName.set('');
    this.password.set('');
    this.name.set('');
    this.email.set('');
    this.signupUsername.set('');
    this.signupPassword.set('');
  }
}
