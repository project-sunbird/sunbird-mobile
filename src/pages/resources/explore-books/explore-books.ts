import {ChangeDetectorRef, Component, ElementRef, Inject, NgZone, OnDestroy, QueryList, ViewChild, ViewChildren} from '@angular/core';
import {IonicPage, NavController, NavParams, Platform, ModalController, ViewController} from 'ionic-angular';
import {AudienceFilter, Map, MimeType, Search} from "@app/app";
import {
  Environment,
  ImpressionSubtype,
  ImpressionType,
  InteractSubtype,
  InteractType,
  PageId
} from "@app/service/telemetry-constants";
import {
  ContentSearchCriteria, ContentSearchResult,
  ContentService,
  FrameworkUtilService,
  ProfileType,
  SearchType,
  SharedPreferences
} from "sunbird-sdk";
import {AppGlobalService, AppHeaderService, CommonUtilService, TelemetryGeneratorService} from "@app/service";
import {animate, group, state, style, transition, trigger} from '@angular/animations';
import {TranslateService} from "@ngx-translate/core";
import {FormControl, FormGroup, Validators} from "@angular/forms";
import {Observable, Subscription} from "rxjs";
import {CollectionDetailsEtbPage} from "@app/pages/collection-details-etb/collection-details-etb";
import {ContentDetailsPage} from "@app/pages/content-details/content-details";
import {ExploreBooksSort} from '../explore-books-sort/explore-books-sort';


@IonicPage()
@Component({
  selector: 'page-explore-books',
  templateUrl: 'explore-books.html',
  animations: [
    trigger('appear', [
      state('true', style({
        left: '{{left_indent}}',
      }), {params: {left_indent: 0}}), // default parameters values required

      transition('* => classAnimate', [
        style({width: 5, opacity: 0}),
        group([
          animate('0.3s 0.2s ease', style({
            transform: 'translateX(0) scale(1.2)', width: '*',
          })),
          animate('0.2s ease', style({
            opacity: 1
          }))
        ])
      ]),
    ]),
    trigger('ScrollHorizontal', [
      state('true', style({
        left: '{{left_indent}}',
        transform: 'translateX(-100px)',
      }), {params: {left_indent: 0}}), // default parameters values required

      transition('* => classAnimate', [
        // style({ width: 5, transform: 'translateX(-100px)', opacity: 0 }),
        group([
          animate('0.3s 0.5s ease', style({
            transform: 'translateX(-100px)'
          })),
          animate('0.3s ease', style({
            opacity: 1
          }))
        ])
      ]),
    ])
  ]

})
export class ExploreBooksPage implements OnDestroy {

  @ViewChild('searchInput') public searchInputRef: ElementRef;
  @ViewChildren('filteredItems') public filteredItemsQueryList: QueryList<any>;

  JSON = JSON;
  categoryGradeLevels: any;
  subjects: any;
  mimeTypes = [
    {name: 'ALL', selected: true, value: ['all'], iconNormal: '', iconActive: ''},
    {name: 'TEXTBOOK', value: [], iconNormal: './assets/imgs/book.svg', iconActive: './assets/imgs/book-active.svg'},
    {
      name: 'VIDEOS',
      value: ['video/mp4', 'video/x-youtube', 'video/webm'],
      iconNormal: './assets/imgs/play.svg',
      iconActive: './assets/imgs/play-active.svg'
    },
    {
      name: 'DOCS',
      value: ['application/pdf', 'application/epub'],
      iconNormal: './assets/imgs/doc.svg',
      iconActive: './assets/imgs/doc-active.svg'
    },
    {
      name: 'INTERACTION',
      value: ['application/vnd.ekstep.ecml-archive', 'application/vnd.ekstep.h5p-archive', 'application/vnd.ekstep.html-archive'],
      iconNormal: './assets/imgs/touch.svg', iconActive: './assets/imgs/touch-active.svg'
    }
  ];
  headerObservable: any;
  unregisterBackButton: any;
  selectedLanguageCode = '';
  contentType: Array<string> = [];
  audienceFilter = [];
  contentSearchResult: Array<any> = [];
  showLoader = false;
  searchFormSubscription?: Subscription;
  mimeTypeValue: any;

  searchForm: FormGroup = new FormGroup({
    'framework': new FormControl(null, Validators.required),
    'grade': new FormControl([]),
    'subject': new FormControl([]),
    'board': new FormControl([]),
    'medium': new FormControl([]),
    'query': new FormControl('', {updateOn: 'submit'}),
    'mimeType': new FormControl([this.mimeTypeValue])
  });

  constructor(
    public navCtrl: NavController,
    public navParams: NavParams,
    public modalCtrl: ModalController,
    private zone: NgZone,
    private commonUtilService: CommonUtilService,
    private headerService: AppHeaderService,
    private appGlobalService: AppGlobalService,
    private translate: TranslateService,
    private changeDetectionRef: ChangeDetectorRef,
    private telemetryGeneratorService: TelemetryGeneratorService,
    @Inject('FRAMEWORK_UTIL_SERVICE') private frameworkUtilService: FrameworkUtilService,
    @Inject('SHARED_PREFERENCES') private sharedPreferences: SharedPreferences,
    @Inject('CONTENT_SERVICE') private contentService: ContentService,
  ) {
    this.handleBackButton();
  }

  async ionViewDidLoad() {
    this.categoryGradeLevels = this.navParams.get('categoryGradeLevels');
    this.subjects = this.navParams.get('subjects');
    this.subjects.unshift({name: this.commonUtilService.translateMessage('ALL'), selected: true});

    this.contentType = this.navParams.get('contentType');
    this.selectedLanguageCode = this.translate.currentLang;
    this.checkUserSession();

    this.searchFormSubscription = this.onSearchFormChange().subscribe();

    this.searchForm.get('framework').patchValue(await this.sharedPreferences.getString('sunbirdcurrent_framework_id').toPromise());

  }

  ionViewWillEnter() {

    this.headerObservable = this.headerService.headerEventEmitted$.subscribe(eventName => {
      this.handleHeaderEvents(eventName);
    });

    this.headerService.showHeaderWithBackButton();

    this.telemetryGeneratorService.generateImpressionTelemetry(
      ImpressionType.VIEW,
      ImpressionSubtype.EXPLORE_MORE_CONTENT,
      PageId.EXPLORE_MORE_CONTENT,
      Environment.HOME
    )
  }

  ngOnDestroy(): void {
    if (this.searchFormSubscription) {
      this.searchFormSubscription.unsubscribe();
    }
  }

  handleBackButton() {

  }

  handleHeaderEvents($event) {
    switch ($event.name) {
      case 'back':
        // this.telemetryGeneratorService.generateBackClickedTelemetry(
        // PageId.ONBOARDING_PROFILE_PREFERENCES, Environment.ONBOARDING, true);
        // this.dismissPopup();
        this.navCtrl.pop();
        break;
    }
  }

  checkUserSession() {
    const isGuestUser = !this.appGlobalService.isUserLoggedIn();

    if (isGuestUser) {
      const userType = this.appGlobalService.getGuestUserType();
      if (userType === ProfileType.STUDENT) {
        this.audienceFilter = AudienceFilter.GUEST_STUDENT;
      } else if (userType === ProfileType.TEACHER) {
        this.audienceFilter = AudienceFilter.GUEST_TEACHER;
      }
    } else {
      this.audienceFilter = AudienceFilter.LOGGED_IN_USER;
    }
  }

  private onSearchFormChange(): Observable<undefined> {
    const value = new Map();
    return this.searchForm.valueChanges
      .do(() => {
        value['currentFilters'] = this.searchForm.value;
      })
      .debounceTime(200)
      .switchMap(() => {
        const searchCriteria: ContentSearchCriteria = {
          ...this.searchForm.getRawValue(),
          query: this.searchInputRef.nativeElement['value'],
          searchType: SearchType.SEARCH,
          contentTypes: this.contentType,
          facets: Search.FACETS,
          audience: this.audienceFilter,
          mode: 'soft',
          languageCode: this.selectedLanguageCode,
        };

        value['searchCriteria'] = searchCriteria;
        this.showLoader = true;
        return this.contentService.searchContent(searchCriteria)
      })
      .do((result: ContentSearchResult) => {
        this.zone.run(() => {
          if (result) {
            this.showLoader = false;
            this.contentSearchResult = result.contentDataList;
            value['searchResult'] = this.contentSearchResult.length;
          }
        });
        this.telemetryGeneratorService.generateInteractTelemetry(
          InteractType.TOUCH,
          InteractSubtype.SEARCH_CRITERIA,
          Environment.HOME,
          PageId.FILTER_CLICKED,
          undefined,
          value)
      })
      .mapTo(undefined);
  }

  openContent(content, index) {

    if (content.mimeType === MimeType.COLLECTION) {
      this.navCtrl.push(CollectionDetailsEtbPage,{
        content: content
      });
    } else {
      this.navCtrl.push(ContentDetailsPage, {
        content: content
      });
    }

  }

  ionViewWillLeave() {
    if (this.headerObservable) {
      this.headerObservable.unsubscribe();
    }
  }

  openSortOptionsModal() {
    const sortOptionsModal = this.modalCtrl.create(ExploreBooksSort, {searchForm: this.searchForm});
    sortOptionsModal.onDidDismiss(data => {
      console.log('ondismiss', data);
      if (data) {
        this.searchForm.patchValue({
          'board': data.board,
          'medium': data.medium
        });
        const values = new Map();
        values['board'] = data.board;
        values['medium'] = data.medium;
        this.telemetryGeneratorService.generateInteractTelemetry(
          InteractType.TOUCH,
          InteractSubtype.SORT_BY_CLICKED,
          Environment.HOME,
          PageId.EXPLORE_MORE_CONTENT,
          undefined,
          values
        );
      }
    });
    this.telemetryGeneratorService.generateInteractTelemetry(
      InteractType.TOUCH,
      InteractSubtype.SORT_BY_CLICKED,
      Environment.HOME,
      PageId.EXPLORE_MORE_CONTENT
    );

    sortOptionsModal.present();
  }

  onMimeTypeClicked(mimeType, index) {
    console.log(mimeType);
    console.log(this.searchForm.value);
    this.mimeTypes.forEach((value) => {
      value.selected = false;
    });

    this.mimeTypes[index].selected = true;
  }
}
