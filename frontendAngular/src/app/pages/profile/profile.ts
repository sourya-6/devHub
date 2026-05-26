import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProfileService } from '../../services/profile/profile';
import { Router } from '@angular/router';

@Component({
  selector: 'app-profile',
  imports: [CommonModule],
  templateUrl: './profile.html',
  styleUrl: './profile.css',
})
export class ProfilePage {
  bio = signal('');
  skills = signal(''); // comma separated
  github = signal('');
  linkedin = signal('');
  website = signal('');
  avatarPreview = signal('');
  avatarFile: File | null = null;

  constructor(private profileService: ProfileService, private router: Router) {}

  setBio(e: Event) {
    this.bio.set((e.target as HTMLTextAreaElement).value);
  }
  setSkills(e: Event) {
    this.skills.set((e.target as HTMLInputElement).value);
  }
  setGithub(e: Event) {
    this.github.set((e.target as HTMLInputElement).value);
  }
  setLinkedin(e: Event) {
    this.linkedin.set((e.target as HTMLInputElement).value);
  }
  setWebsite(e: Event) {
    this.website.set((e.target as HTMLInputElement).value);
  }

  onFileChange(e: Event) {
    const input = e.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.avatarFile = input.files[0];
      const reader = new FileReader();
      reader.onload = () => this.avatarPreview.set(String(reader.result));
      reader.readAsDataURL(this.avatarFile);
    }
  }

  saveProfile() {
    const payload = {
      bio: this.bio(),
      skills: this.skills() ? this.skills().split(',').map(s=>s.trim()).filter(Boolean) : [],
      links: {
        github: this.github(),
        linkedin: this.linkedin(),
        website: this.website()
      }
    };

    this.profileService.updateProfile(payload).subscribe({
      next: (res) => {
        alert('Profile updated');
        if (this.avatarFile) {
          this.profileService.uploadAvatar(this.avatarFile!).subscribe({
            next: () => { alert('Avatar uploaded'); this.router.navigate(['/dashbord']); },
            error: (err) => { console.error(err); alert('Avatar upload failed'); }
          })
        } else {
          this.router.navigate(['/dashbord']);
        }
      },
      error: (err) => { console.error(err); alert('Profile update failed'); }
    })
  }
}
