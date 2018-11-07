var app = angular.module('gallery', [ 'ngAnimate', 'ui.bootstrap', 'FBAngular', 'ngTouch' ]);

app.config(function($locationProvider) {
    $locationProvider.html5Mode({
        enabled: true,
        requireBase: false
    });
});

app.controller('GalleryController', function($scope, $http, $timeout, $window, $document, $anchorScroll, $location, Fullscreen, $rootScope) {

    $scope.carouselInterval = 0;
    $scope.noWrapSlides = false;
    $scope.images = [];
    $scope.videos = [];
    $scope.imageFormats = [];
    $scope.videoFormats = [];
    $scope.activeVideoFormat = {};
    $scope.activeVideoFormat.id = null;
    $scope.currentIndex = 1;
    $scope.previousPath = null;
    $scope.currentPathDisplay = null;
    $scope.currentVideoIndex = -1;
    $scope.allowCustomImageSizes = false;
    $scope.showSlidesBool = false;
    $scope.settingFullscreen = {};
    $scope.settingFullscreen.val = 0;
    $scope.queryParamServicePath = "p";
    $scope.counter = 0;

    $scope.getListing = function(newUrl, pushState) {
        var url;
        var currentPushState = pushState;
        if (newUrl != null) {
            url = newUrl;
        } else {
            url = contextPath;
            if (url.endsWith("#")) {
                url = url.substring(0, url.length - 2);
            }
            url = url + "service";
        }
        $http.get(url).then(function(response) {
            var data = response.data;            
            $scope.directories = data.directories;
            $scope.images = data.images;
            $scope.videos = data.videos;
            $scope.previousPath = data.previousPath;
            $scope.currentPathDisplay = data.currentPathDisplay;
            $scope.allowCustomImageSizes = data.allowCustomImageSizes;
            $scope.imageFormats = data.imageFormats;
            $scope.videoFormats = data.videoFormats;
            if ($scope.activeVideoFormat.id == null && $scope.videoFormats.length > 0) {
                $scope.activeVideoFormat.id = $scope.videoFormats[0];
            }
            var servicePathParam = $scope.generateUrlQueryParam(url)
            if (servicePathParam) {
                servicePathParam = "?" + servicePathParam;
            }
            $location.search({p: url});
            $scope.counter++;
        });
    }
    
    $scope.generateUrlQueryParam = function(serviceUrl) {
        return $scope.queryParamServicePath + "=" + encodeURI(serviceUrl);
    }
    
    $scope.getServicePathFromQueryParam = function(url) {
        var urlParams = new URLSearchParams(url);
        return urlParams.get($scope.queryParamServicePath);
    }
    
    $scope.enableSlideshow = function(index) {
		//$scope.slides = $scope.images.slice(index - 1, index + 1);
        var slideshow = true;
        $scope.showSlidesBool = true;
        $scope.currentIndex = index;
        $location.hash("slideshow");
        if ($scope.settingFullscreen.val) {
            Fullscreen.enable(document.getElementById('fullScreenImage'));
        }
    }
    
    $scope.disableSlideshow = function() {
        console.debug("disableSlideshow");
        $scope.showSlidesBool = false;
        $scope.currentIndex = $scope.findCurrentIndex();
        
        if ($scope.settingFullscreen.val) {
            Fullscreen.cancel();
        }
        $timeout(function(){
             $location.hash("image" + $scope.currentIndex);
        }, 0);
    }
	
	$scope.shouldShowSlide = function(slide, currentIndex) {
		var slideIndex = $scope.images.indexOf(slide);
		var shouldShowSlide = Math.abs(currentIndex - slideIndex) <= 1;
		console.debug("slide: " + slide + ", currentIndex: " + currentIndex + ", slideIndex: " + slideIndex + ", shouldShowSlide: " + shouldShowSlide);
		
		return shouldShowSlide;
	}

    /**
     * There is no obvious way to find the current index of the carousel once
     * the user has navigated around with the arrows. Have to find the element
     * that is active by iterating over all of them and checking the class.
     */
    $scope.findCurrentIndex = function() {
        var carouselElems = document.getElementsByClassName("carousel-inner");
        console.debug("carouselElems size: " + carouselElems.length);
        var carouselChildren = carouselElems[0].children;
        console.debug("carouselChildren size: " + carouselChildren.length);
        for (var i = 0; i < carouselChildren.length; i++) {
            var childActive = carouselChildren[i].classList.contains("active");
            if (childActive) {
                return i;
            }
        }
        return 0;
    }

    $scope.showSlides = function() {
        return $scope.showSlidesBool;
    }

    $scope.getFullScreenImageUrl = function(slide) {
        var ratio = $window.devicePixelRatio || 1;
        var width = Math.round($window.screen.width * ratio);
        var height = Math.round($window.screen.height * ratio);
        if ($scope.allowCustomImageSizes) {
            return $scope.getCustomImageUrl(slide, width, height);
        } else {
            var imageFormat = $scope.determineBestImageFormat(width, height);
            return $scope.getFormatImageUrl(slide, imageFormat.code);
        }
    }

    $scope.determineBestImageFormat = function(width, height) {
        var nrPixels = width * height;
        var bestMatchPixelsDiff = Number.MAX_SAFE_INTEGER;
        var bestMatchImageFormat = null;
        for (var i = 0; i < $scope.imageFormats.length; i++) {
            var oneImageFormat = $scope.imageFormats[i];
            var nrPixelDiff = Math.abs(oneImageFormat.width * oneImageFormat.height - nrPixels);
            if (nrPixelDiff < bestMatchPixelsDiff) {
                bestMatchPixelsDiff = nrPixelDiff;
                bestMatchImageFormat = oneImageFormat;
            }
        }
        return bestMatchImageFormat;
    }

    $scope.getCustomImageUrl = function(slide, width, height) {
        if (slide.freeSizePath != null) {
            var url = slide.freeSizePath.replace("{width}", width).replace("{height}", height);
            return url;
        }
        return "";
    }

    $scope.getFormatImageUrl = function(slide, formatCode) {
        if (slide.freeSizePath != null) {
            var url = slide.formatPath.replace("{imageFormat}", formatCode);
            return url;
        }
        return "";
    }

    $scope.shouldShowVideo = function(index) {
        return $scope.currentVideoIndex == index;
    }

    $scope.toggleVideo = function(index) {
        if ($scope.currentVideoIndex == index) {
            $scope.currentVideoIndex = -1;
        } else {
            $scope.currentVideoIndex = index;
        }
    }

    $scope.getVideoUrl = function(video) {
        if (video.formatPath != null) {
            var url = video.formatPath.replace("{conversionFormat}", $scope.activeVideoFormat.id);
            return url;
        }
        return "";
    }

    $scope.getGalleryTabTitle = function() {
        return "GALLERY" + (($scope.images != null && $scope.images.length > 0) ? " (" + $scope.images.length + ")" : "");
    }

    $scope.getVideoTabTitle = function() {
        return "VIDEO" + (($scope.videos != null && $scope.videos.length > 0) ? " (" + $scope.videos.length + ")" : "");
    }
    
    $rootScope.$on('$locationChangeSuccess', function (a, newUrl, oldUrl, newState, oldState) {
        var hashFromOldUrl = $scope.getHashFromUrlString(oldUrl);
        $rootScope.actualLocationSearch = $location.search();
        $rootScope.actualLocationHash = hashFromOldUrl;
    });        

    $scope.getHashFromUrlString = function(urlString) {
        var hashIndex = urlString.indexOf("#");
        if (hashIndex > 0) {
            return urlString.substring(hashIndex + 1, urlString.length);
        }
        return urlString;
    }
    
    $rootScope.$watch(function () {return $location.search()}, function (newLocation, oldLocation) {
        if($rootScope.actualLocationSearch === newLocation) {
            if ($rootScope.actualLocationHash === "slideshow") {
                $scope.disableSlideshow();
            } else {
                $scope.getListing(newLocation.p);
            }
        }
    });

    $scope.trimTrailingSlash = function(url) {
        if (url.endsWith("/")) {
            url = url.substring(0, url.length - 2);
        }
        return url;
    }
    
    $scope.getListing();

    window.addEventListener("load",function() {
        setTimeout(function(){
            // This hides the address bar:
            window.scrollTo(0, 1);
        }, 0);
    });
    
    window.onpopstate = function(event) {
    };

}).directive('lazyLoad', lazyLoad)

function lazyLoad(){
    return {
        restrict: 'A',
        link: function(scope, element, attrs){
            const observer = new IntersectionObserver(loadImg)
            const img = angular.element(element)[0];
            observer.observe(img)

            function loadImg(changes){
                changes.forEach(change => {
                    if(change.intersectionRatio > 0){
                        var topLevelNodeForOneThumbnail = change.target.parentNode.parentNode;
                        var thumbnailsRootNode = change.target.parentNode.parentNode.parentNode;
                        var i = Array.prototype.indexOf.call(thumbnailsRootNode.children , topLevelNodeForOneThumbnail);
                        change.target.src = scope.getFormatImageUrl(scope.images[i], 'thumb');
						const img = angular.element(change.target)[0];
                        observer.unobserve(img);
                    }
                })
            }    

        }
    }
};
