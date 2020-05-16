import { BrowserModule } from '@angular/platform-browser';
import { NgModule, APP_INITIALIZER } from '@angular/core';
import { AppComponent } from './application/app.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HeaderComponent } from './components/header/header.component';
import { FooterComponent } from './components/footer/footer.component';
import { SearchSongComponent } from './components/search-song/search-song.component';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { HttpClientModule } from '@angular/common/http';
import { SongDetailsComponent } from './components/song-details/song-details.component';
import { PageNotFoundComponent } from './components/page-not-found/page-not-found.component';
import { AppRoutingModule } from './app.routing';
import { MainPageComponent } from './components/main-page/main-page.component';
import { LiturgyComponent } from './components/liturgy/liturgy.component';
import { ReplaceSpacePipe } from './pipes/replace-space/replace-space.pipe';
import { startUpFactory } from './services/start-up-service/start-up.service';
import { SongService } from './services/song-service/song.service';
import { MatIconRegistryService } from './services/mat-icon-registry-service/mat-icon-registry.service';
@NgModule({
  declarations: [
    AppComponent,
    HeaderComponent,
    SongDetailsComponent,
    FooterComponent,
    SearchSongComponent,
    PageNotFoundComponent,
    MainPageComponent,
    LiturgyComponent,
    ReplaceSpacePipe,
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    ReactiveFormsModule,
    HttpClientModule,
    AppRoutingModule,
    MatListModule,
    MatMenuModule,
    MatAutocompleteModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule,
  ],
  providers: [
    {
      provide: APP_INITIALIZER,
      useFactory: startUpFactory,
      deps: [MatIconRegistryService, SongService],
      multi: true,
    },
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
