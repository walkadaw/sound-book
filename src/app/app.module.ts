import { BrowserModule } from '@angular/platform-browser';
import { NgModule, APP_INITIALIZER } from '@angular/core';
import { AppComponent } from './application/app.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HeaderComponent } from './components/header/header.component';
import { FooterComponent } from './components/footer/footer.component';
import { SearchSongComponent } from './components/search-song/search-song.component';
import { ReactiveFormsModule } from '@angular/forms';
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
import { StoreModule } from '@ngrx/store';
import { searchReducer } from './redux/reducers/search.reducer';
import { MenuSearchDialogComponent } from './components/menu-search-dialog/menu-search-dialog.component';
import { PaperGeneratorComponent } from './components/paper-generator/paper-generator.component';
import { MainSoundComponent } from './application/main-sound/main-sound.component';
import { LiturgyModule } from './services/liturgy-service/liturgy.module';
import { SongModule } from './services/song-service/song.module';
import { MatModule } from './mat.module';
import { LetDirectiveModule } from './directives/let-directive/app-let.module';
import { settingsReducer } from './redux/reducers/settings.reducer';

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
    MenuSearchDialogComponent,
    PaperGeneratorComponent,
    MainSoundComponent,
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    ReactiveFormsModule,
    HttpClientModule,
    AppRoutingModule,
    // redux
    StoreModule.forRoot({
      searchInput: searchReducer,
      settings: settingsReducer,
    }),
    LetDirectiveModule,
    MatModule,
    LiturgyModule,
    SongModule,
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
